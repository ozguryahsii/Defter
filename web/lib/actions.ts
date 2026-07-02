"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { auth } from "./auth";
import { randomBytes } from "crypto";
import { equalShares, ratioShares, calculateSettlement } from "./settlement";
import { logActivity } from "./activity";
import { notify, notifyGroupMembers } from "./notify";
import { saveReceipt } from "./uploads";
import { materializeRecurring } from "./recurring";

export type ActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  groupId?: string;
  token?: string;
};

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "En az 3 karakter")
    .max(50)
    .regex(/^[a-zA-Z0-9._-]+$/, "Sadece harf, rakam ve . _ -"),
  displayName: z.string().trim().max(100).optional(),
  password: z.string().min(8, "En az 8 karakter"),
});

export async function registerUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    username: formData.get("username"),
    displayName: formData.get("displayName") || undefined,
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const issue of parsed.error.issues) fe[String(issue.path[0])] = issue.message;
    return { ok: false, fieldErrors: fe };
  }

  const exists = await prisma.user.findUnique({
    where: { username: parsed.data.username },
  });
  if (exists) return { ok: false, error: "Bu kullanıcı adı zaten alınmış." };

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.create({
    data: {
      username: parsed.data.username,
      displayName: parsed.data.displayName || null,
      passwordHash,
    },
  });

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------
const groupSchema = z.object({
  name: z.string().trim().min(1, "Grup adı gerekli").max(100),
  type: z.enum(["Tatil", "Girisim"]),
  currency: z.enum(["TRY", "USD", "EUR", "GBP"]),
});

export async function createGroup(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." };

  const parsed = groupSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    currency: formData.get("currency"),
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const issue of parsed.error.issues) fe[String(issue.path[0])] = issue.message;
    return { ok: false, fieldErrors: fe };
  }

  const group = await prisma.group.create({
    data: {
      ...parsed.data,
      createdById: session.user.id,
      members: { create: { userId: session.user.id } },
    },
  });

  await logActivity({
    groupId: group.id,
    actorId: session.user.id,
    type: "group.create",
    summary: `"${group.name}" grubu oluşturuldu`,
  });

  revalidatePath("/groups");
  revalidatePath("/dashboard");
  return { ok: true, groupId: group.id };
}

export async function addMember(
  groupId: string,
  username: string,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." };

  const member = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id },
  });
  if (!member) return { ok: false, error: "Bu gruba erişiminiz yok." };

  const name = username.trim();
  if (!name) return { ok: false, error: "Kullanıcı adı boş olamaz." };

  const user = await prisma.user.findUnique({ where: { username: name } });
  if (!user) return { ok: false, error: `'${name}' bulunamadı.` };

  const already = await prisma.groupMember.findFirst({
    where: { groupId, userId: user.id },
  });
  if (already) return { ok: false, error: `'${name}' zaten grupta.` };

  await prisma.groupMember.create({ data: { groupId, userId: user.id } });
  await logActivity({
    groupId,
    actorId: session.user.id,
    type: "member.add",
    summary: `${user.displayName ?? user.username} gruba eklendi`,
  });

  const groupInfo = await prisma.group.findUnique({ where: { id: groupId } });
  await notify({
    userId: user.id,
    type: "member.add",
    title: `"${groupInfo?.name ?? "Bir grup"}" grubuna eklendin`,
    body: `${session.user.name ?? "Bir kullanıcı"} seni gruba ekledi.`,
    groupId,
  });

  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------
export async function addExpense(input: {
  groupId: string;
  description: string;
  category?: string;
  amount: number; // in group currency
  payerId: string;
  date: string;
  splitType: "Equal" | "Exact" | "Ratio";
  participantIds: string[];
  exactAmounts?: Record<string, number>;
  // Optional multi-currency record: what was originally entered.
  originalAmount?: number;
  originalCurrency?: string;
  fxRate?: number;
}): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." };

  const group = await prisma.group.findFirst({
    where: { id: input.groupId, members: { some: { userId: session.user.id } } },
    include: { members: true },
  });
  if (!group) return { ok: false, error: "Bu gruba erişiminiz yok." };

  const memberIds = new Set(group.members.map((m) => m.userId));
  const participants = [...new Set(input.participantIds)].filter((id) =>
    memberIds.has(id),
  );

  const amount = Math.round(input.amount * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0)
    return { ok: false, error: "Tutar 0'dan büyük olmalı." };
  if (!input.description.trim())
    return { ok: false, error: "Açıklama gerekli." };
  if (!memberIds.has(input.payerId))
    return { ok: false, error: "Ödeyen grup üyesi olmalı." };
  if (participants.length === 0)
    return { ok: false, error: "En az bir katılımcı seçmelisiniz." };

  let shares: { userId: string; amount: number }[];
  if (input.splitType === "Exact") {
    shares = participants.map((userId) => ({
      userId,
      amount: Math.round((input.exactAmounts?.[userId] ?? 0) * 100) / 100,
    }));
    const sum = shares.reduce((s, x) => s + x.amount, 0);
    if (Math.round(sum * 100) !== Math.round(amount * 100))
      return {
        ok: false,
        error: `Payların toplamı (${sum.toFixed(2)}) tutara (${amount.toFixed(2)}) eşit olmalı.`,
      };
  } else if (input.splitType === "Ratio") {
    const ratioById = new Map(
      group.members.map((m) => [m.userId, m.shareRatio ?? 0]),
    );
    shares = ratioShares(
      amount,
      participants.map((userId) => ({
        userId,
        ratio: ratioById.get(userId) ?? 0,
      })),
    );
  } else {
    shares = equalShares(amount, participants);
  }

  const hasFx =
    !!input.originalCurrency &&
    input.originalCurrency !== group.currency &&
    Number.isFinite(input.fxRate) &&
    (input.fxRate ?? 0) > 0;

  const created = await prisma.expense.create({
    data: {
      groupId: input.groupId,
      payerId: input.payerId,
      amount,
      description: input.description.trim(),
      category: input.category?.trim() || null,
      date: new Date(input.date),
      splitType: input.splitType,
      originalAmount: hasFx ? input.originalAmount ?? null : null,
      originalCurrency: hasFx ? input.originalCurrency ?? null : null,
      fxRate: hasFx ? input.fxRate ?? null : null,
      shares: { create: shares },
    },
  });

  await logActivity({
    groupId: input.groupId,
    actorId: session.user.id,
    type: "expense.add",
    summary: `"${created.description}" harcaması eklendi`,
    meta: { amount, expenseId: created.id },
  });

  await notifyGroupMembers({
    groupId: input.groupId,
    exceptUserId: session.user.id,
    type: "expense.add",
    title: `${session.user.name ?? "Bir üye"} harcama ekledi`,
    body: `"${created.description}" — ${amount.toFixed(2)} ${group.currency}`,
  });

  revalidatePath(`/groups/${input.groupId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteExpense(
  expenseId: string,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." };

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { group: { include: { members: true } } },
  });
  if (
    !expense ||
    !expense.group.members.some((m) => m.userId === session.user.id)
  )
    return { ok: false, error: "Harcama bulunamadı." };

  if (
    expense.payerId !== session.user.id &&
    expense.group.createdById !== session.user.id
  )
    return { ok: false, error: "Bu harcamayı silme yetkiniz yok." };

  await prisma.expense.delete({ where: { id: expenseId } });
  await logActivity({
    groupId: expense.groupId,
    actorId: session.user.id,
    type: "expense.delete",
    summary: `"${expense.description}" harcaması silindi`,
  });
  revalidatePath(`/groups/${expense.groupId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Settlements ("ödendi") — only the creditor (receiver) may confirm/undo.
// ---------------------------------------------------------------------------

/**
 * Marks an outstanding debt (fromUserId owes toUserId) as paid.
 * AUTHORIZATION: only the creditor — the one receiving the money (toUserId) —
 * may do this. The debtor and any third party are rejected. The amount is
 * derived server-side from the current outstanding transfer, so the client
 * cannot inflate it.
 */
export async function settleTransfer(
  groupId: string,
  fromUserId: string,
  toUserId: string,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." };

  // Only the creditor (receiver) can confirm payment.
  if (session.user.id !== toUserId)
    return {
      ok: false,
      error: "Bu borcu yalnızca alacaklı (parayı alan kişi) ödendi işaretleyebilir.",
    };

  const group = await prisma.group.findFirst({
    where: { id: groupId, members: { some: { userId: session.user.id } } },
    include: {
      members: { include: { user: true } },
      expenses: { include: { shares: true } },
      settlements: true,
    },
  });
  if (!group) return { ok: false, error: "Bu gruba erişiminiz yok." };

  const memberIds = new Set(group.members.map((m) => m.userId));
  if (!memberIds.has(fromUserId) || !memberIds.has(toUserId))
    return { ok: false, error: "Geçersiz üye." };

  // Recompute the current outstanding transfers and confirm this one exists.
  const { transfers } = calculateSettlement({
    members: group.members.map((m) => ({
      userId: m.userId,
      userName: m.user.displayName ?? m.user.username,
    })),
    expenses: group.expenses.map((e) => ({
      payerId: e.payerId,
      amount: e.amount,
      shares: e.shares.map((s) => ({ userId: s.userId, amount: s.amount })),
    })),
    settlements: group.settlements.map((p) => ({
      fromUserId: p.fromUserId,
      toUserId: p.toUserId,
      amount: p.amount,
    })),
  });

  const transfer = transfers.find(
    (t) => t.fromUserId === fromUserId && t.toUserId === toUserId,
  );
  if (!transfer || transfer.amount <= 0)
    return { ok: false, error: "Bu borç güncel değil ya da zaten kapanmış." };

  await prisma.settlement.create({
    data: {
      groupId,
      fromUserId,
      toUserId,
      amount: transfer.amount,
      confirmedById: session.user.id,
    },
  });

  await logActivity({
    groupId,
    actorId: session.user.id,
    type: "settle",
    summary: `${transfer.fromUserName} → ${transfer.toUserName}: ödeme alındı (${transfer.amount.toFixed(2)})`,
    meta: { fromUserId, toUserId, amount: transfer.amount },
  });

  await notify({
    userId: fromUserId,
    type: "settle",
    title: `${transfer.toUserName} ödemeni onayladı`,
    body: `${transfer.amount.toFixed(2)} tutarındaki borcun kapandı. 🎉`,
    groupId,
  });

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * "Ödeme Hatırlat": the creditor nudges the debtor with an in-app
 * notification. Rate-limited to once per day per debt (spam guard).
 */
export async function remindTransfer(
  groupId: string,
  fromUserId: string,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." };
  const toUserId = session.user.id; // only the creditor can remind

  const group = await prisma.group.findFirst({
    where: { id: groupId, members: { some: { userId: toUserId } } },
    include: {
      members: { include: { user: true } },
      expenses: { include: { shares: true } },
      settlements: true,
    },
  });
  if (!group) return { ok: false, error: "Bu gruba erişiminiz yok." };

  // The outstanding transfer must actually exist, creditor-side verified.
  const { transfers } = calculateSettlement({
    members: group.members.map((m) => ({
      userId: m.userId,
      userName: m.user.displayName ?? m.user.username,
    })),
    expenses: group.expenses.map((e) => ({
      payerId: e.payerId,
      amount: e.amount,
      shares: e.shares.map((s) => ({ userId: s.userId, amount: s.amount })),
    })),
    settlements: group.settlements.map((p) => ({
      fromUserId: p.fromUserId,
      toUserId: p.toUserId,
      amount: p.amount,
    })),
  });
  const transfer = transfers.find(
    (t) => t.fromUserId === fromUserId && t.toUserId === toUserId,
  );
  if (!transfer) return { ok: false, error: "Bu borç güncel değil." };

  // Rate limit: one reminder per debt per day.
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const metaKey = JSON.stringify({ groupId, fromUserId, toUserId });
  const already = await prisma.notification.findFirst({
    where: {
      userId: fromUserId,
      type: "payment.reminder",
      meta: metaKey,
      createdAt: { gte: dayStart },
    },
  });
  if (already)
    return {
      ok: false,
      error: "Bu borç için bugün zaten hatırlatma gönderdin (günde 1 kez).",
    };

  await notify({
    userId: fromUserId,
    type: "payment.reminder",
    title: `${transfer.toUserName} borcunu hatırlattı`,
    body: `"${group.name}" grubunda ${transfer.amount.toFixed(2)} ${group.currency} borcun var.`,
    groupId,
    meta: { groupId, fromUserId, toUserId },
  });
  // meta alanı rate-limit anahtarı olarak birebir aranıyor; notify JSON'u
  // aynı sırayla yazdığı için üstteki findFirst ile uyumlu.

  return { ok: true };
}

/**
 * Undoes a confirmed payment. AUTHORIZATION: only the creditor who received it
 * (the settlement's toUser) may undo it — restoring the debt.
 */
export async function unsettleTransfer(
  settlementId: string,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." };

  const settlement = await prisma.settlement.findUnique({
    where: { id: settlementId },
    include: { fromUser: true, toUser: true },
  });
  if (!settlement) return { ok: false, error: "Kayıt bulunamadı." };

  if (session.user.id !== settlement.toUserId)
    return {
      ok: false,
      error: "Bu ödemeyi yalnızca alacaklı geri alabilir.",
    };

  await prisma.settlement.delete({ where: { id: settlementId } });
  await logActivity({
    groupId: settlement.groupId,
    actorId: session.user.id,
    type: "unsettle",
    summary: `${settlement.fromUser.displayName ?? settlement.fromUser.username} → ${settlement.toUser.displayName ?? settlement.toUser.username} ödemesi geri alındı`,
  });
  revalidatePath(`/groups/${settlement.groupId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Profile (display name + IBAN for settlements)
// ---------------------------------------------------------------------------
const profileSchema = z.object({
  displayName: z.string().trim().max(100).optional(),
  iban: z
    .string()
    .trim()
    .transform((s) => s.replace(/\s+/g, "").toUpperCase())
    .refine((s) => s === "" || /^TR\d{24}$/.test(s), "Geçerli bir TR IBAN girin (TR + 24 rakam).")
    .optional(),
  ibanName: z.string().trim().max(120).optional(),
});

export async function updateProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." };

  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName") || undefined,
    iban: formData.get("iban") || undefined,
    ibanName: formData.get("ibanName") || undefined,
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const issue of parsed.error.issues) fe[String(issue.path[0])] = issue.message;
    return { ok: false, fieldErrors: fe };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      displayName: parsed.data.displayName || null,
      iban: parsed.data.iban || null,
      ibanName: parsed.data.ibanName || null,
    },
  });

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Account security: change password & delete account (store requirements)
// ---------------------------------------------------------------------------
export async function changePassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." };

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (next.length < 8)
    return { ok: false, fieldErrors: { newPassword: "En az 8 karakter olmalı." } };
  if (next !== confirm)
    return { ok: false, fieldErrors: { confirmPassword: "Parolalar eşleşmiyor." } };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { ok: false, error: "Kullanıcı bulunamadı." };

  const valid = await bcrypt.compare(current, user.passwordHash);
  if (!valid)
    return { ok: false, fieldErrors: { currentPassword: "Mevcut parola hatalı." } };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(next, 12) },
  });

  return { ok: true };
}

/**
 * Deletes the account (store compliance). Personal data is removed; shared
 * group ledgers stay consistent:
 *  - groups where the user is the ONLY member are deleted entirely,
 *  - in shared groups the user's rows remain but are anonymised
 *    ("Silinen Kullanıcı", credentials/IBAN wiped, login impossible).
 */
export async function deleteAccount(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." };

  const password = String(formData.get("password") ?? "");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { ok: false, error: "Kullanıcı bulunamadı." };

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid)
    return { ok: false, fieldErrors: { password: "Parola hatalı." } };

  // Groups where this user is the only member -> remove completely
  // (cascade cleans expenses, settlements, activities, invites, recurring).
  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id },
    select: { groupId: true },
  });
  const soloGroupIds: string[] = [];
  for (const m of memberships) {
    const count = await prisma.groupMember.count({ where: { groupId: m.groupId } });
    if (count === 1) soloGroupIds.push(m.groupId);
  }

  const randomSuffix = Math.random().toString(36).slice(2, 8);
  await prisma.$transaction([
    prisma.group.deleteMany({ where: { id: { in: soloGroupIds } } }),
    prisma.invite.updateMany({
      where: { createdById: user.id },
      data: { active: false },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        username: `silinen_${randomSuffix}`,
        displayName: "Silinen Kullanıcı",
        iban: null,
        ibanName: null,
        // Random hash: login becomes impossible.
        passwordHash: await bcrypt.hash(
          `deleted-${Date.now()}-${Math.random()}`,
          12,
        ),
      },
    }),
  ]);

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Edit expense (payer or group owner)
// ---------------------------------------------------------------------------
export async function editExpense(input: {
  expenseId: string;
  description: string;
  category?: string;
  amount: number;
  payerId: string;
  date: string;
  splitType: "Equal" | "Exact";
  participantIds: string[];
  exactAmounts?: Record<string, number>;
}): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." };

  const expense = await prisma.expense.findUnique({
    where: { id: input.expenseId },
    include: { group: { include: { members: true } } },
  });
  if (
    !expense ||
    !expense.group.members.some((m) => m.userId === session.user.id)
  )
    return { ok: false, error: "Harcama bulunamadı." };
  if (
    expense.payerId !== session.user.id &&
    expense.group.createdById !== session.user.id
  )
    return { ok: false, error: "Bu harcamayı düzenleme yetkiniz yok." };

  const memberIds = new Set(expense.group.members.map((m) => m.userId));
  const participants = [...new Set(input.participantIds)].filter((id) =>
    memberIds.has(id),
  );
  const amount = Math.round(input.amount * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0)
    return { ok: false, error: "Tutar 0'dan büyük olmalı." };
  if (!input.description.trim()) return { ok: false, error: "Açıklama gerekli." };
  if (!memberIds.has(input.payerId))
    return { ok: false, error: "Ödeyen grup üyesi olmalı." };
  if (participants.length === 0)
    return { ok: false, error: "En az bir katılımcı seçmelisiniz." };

  let shares: { userId: string; amount: number }[];
  if (input.splitType === "Exact") {
    shares = participants.map((userId) => ({
      userId,
      amount: Math.round((input.exactAmounts?.[userId] ?? 0) * 100) / 100,
    }));
    const sum = shares.reduce((s, x) => s + x.amount, 0);
    if (Math.round(sum * 100) !== Math.round(amount * 100))
      return {
        ok: false,
        error: `Payların toplamı (${sum.toFixed(2)}) tutara (${amount.toFixed(2)}) eşit olmalı.`,
      };
  } else {
    shares = equalShares(amount, participants);
  }

  await prisma.$transaction([
    prisma.expenseShare.deleteMany({ where: { expenseId: input.expenseId } }),
    prisma.expense.update({
      where: { id: input.expenseId },
      data: {
        payerId: input.payerId,
        amount,
        description: input.description.trim(),
        category: input.category?.trim() || null,
        date: new Date(input.date),
        splitType: input.splitType,
        shares: { create: shares },
      },
    }),
  ]);

  await logActivity({
    groupId: expense.groupId,
    actorId: session.user.id,
    type: "expense.edit",
    summary: `"${input.description.trim()}" harcaması düzenlendi`,
  });

  revalidatePath(`/groups/${expense.groupId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Receipt photo
// ---------------------------------------------------------------------------
export async function attachReceipt(
  expenseId: string,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." };

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { group: { include: { members: true } } },
  });
  if (
    !expense ||
    !expense.group.members.some((m) => m.userId === session.user.id)
  )
    return { ok: false, error: "Harcama bulunamadı." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: "Dosya seçilmedi." };

  const saved = await saveReceipt(expenseId, file);
  if (!saved.ok) return { ok: false, error: saved.error };

  await prisma.expense.update({
    where: { id: expenseId },
    data: { receiptPath: saved.filename },
  });

  revalidatePath(`/groups/${expense.groupId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Invite links
// ---------------------------------------------------------------------------
export async function createInvite(groupId: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." };

  const member = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id },
  });
  if (!member) return { ok: false, error: "Bu gruba erişiminiz yok." };

  const token = randomBytes(16).toString("hex");
  await prisma.invite.create({
    data: {
      groupId,
      token,
      createdById: session.user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 gün
    },
  });

  return { ok: true, token };
}

export async function joinViaInvite(token: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." };

  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite || !invite.active)
    return { ok: false, error: "Davet linki geçersiz." };
  if (invite.expiresAt && invite.expiresAt < new Date())
    return { ok: false, error: "Davet linkinin süresi dolmuş." };
  if (invite.maxUses != null && invite.uses >= invite.maxUses)
    return { ok: false, error: "Davet linki kullanım limitine ulaşmış." };

  const existing = await prisma.groupMember.findFirst({
    where: { groupId: invite.groupId, userId: session.user.id },
  });
  if (existing) return { ok: true, groupId: invite.groupId };

  await prisma.$transaction([
    prisma.groupMember.create({
      data: { groupId: invite.groupId, userId: session.user.id },
    }),
    prisma.invite.update({
      where: { id: invite.id },
      data: { uses: { increment: 1 } },
    }),
  ]);

  await logActivity({
    groupId: invite.groupId,
    actorId: session.user.id,
    type: "member.join",
    summary: `${session.user.name ?? "Bir kullanıcı"} davet linkiyle katıldı`,
  });

  revalidatePath(`/groups/${invite.groupId}`);
  return { ok: true, groupId: invite.groupId };
}

// ---------------------------------------------------------------------------
// Venture (Girisim) ownership ratios — owner only
// ---------------------------------------------------------------------------
export async function setShareRatios(
  groupId: string,
  ratios: Record<string, number>,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." };

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: true },
  });
  if (!group) return { ok: false, error: "Grup bulunamadı." };
  if (group.createdById !== session.user.id)
    return { ok: false, error: "Oranları yalnızca grup sahibi belirleyebilir." };

  await prisma.$transaction(
    group.members.map((m) => {
      const r = ratios[m.userId];
      return prisma.groupMember.update({
        where: { id: m.id },
        data: { shareRatio: Number.isFinite(r) && r > 0 ? r : null },
      });
    }),
  );

  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Monthly budget — owner only
// ---------------------------------------------------------------------------
export async function setBudget(
  groupId: string,
  amount: number | null,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." };

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) return { ok: false, error: "Grup bulunamadı." };
  if (group.createdById !== session.user.id)
    return { ok: false, error: "Bütçeyi yalnızca grup sahibi belirleyebilir." };

  const value =
    amount != null && Number.isFinite(amount) && amount > 0
      ? Math.round(amount * 100) / 100
      : null;

  await prisma.group.update({
    where: { id: groupId },
    data: { monthlyBudget: value },
  });

  await logActivity({
    groupId,
    actorId: session.user.id,
    type: "budget.set",
    summary: value ? `Aylık bütçe ${value.toFixed(2)} olarak ayarlandı` : "Aylık bütçe kaldırıldı",
  });

  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Recurring expense templates
// ---------------------------------------------------------------------------
export async function addRecurring(input: {
  groupId: string;
  description: string;
  category?: string;
  amount: number;
  payerId: string;
  interval: "weekly" | "monthly";
  startDate: string;
  participantIds: string[];
}): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." };

  const group = await prisma.group.findFirst({
    where: { id: input.groupId, members: { some: { userId: session.user.id } } },
    include: { members: true },
  });
  if (!group) return { ok: false, error: "Bu gruba erişiminiz yok." };

  const memberIds = new Set(group.members.map((m) => m.userId));
  const participants = [...new Set(input.participantIds)].filter((id) =>
    memberIds.has(id),
  );
  const amount = Math.round(input.amount * 100) / 100;
  if (!input.description.trim()) return { ok: false, error: "Açıklama gerekli." };
  if (!Number.isFinite(amount) || amount <= 0)
    return { ok: false, error: "Tutar 0'dan büyük olmalı." };
  if (!memberIds.has(input.payerId))
    return { ok: false, error: "Ödeyen grup üyesi olmalı." };
  if (participants.length === 0)
    return { ok: false, error: "En az bir katılımcı seçmelisiniz." };

  const start = new Date(input.startDate);
  if (Number.isNaN(start.getTime()))
    return { ok: false, error: "Geçersiz başlangıç tarihi." };

  await prisma.recurringExpense.create({
    data: {
      groupId: input.groupId,
      description: input.description.trim(),
      category: input.category?.trim() || null,
      amount,
      payerId: input.payerId,
      splitType: "Equal",
      participantIds: JSON.stringify(participants),
      interval: input.interval,
      nextRunAt: start,
    },
  });

  await logActivity({
    groupId: input.groupId,
    actorId: session.user.id,
    type: "recurring.add",
    summary: `Tekrarlayan harcama eklendi: "${input.description.trim()}"`,
  });

  // Materialize immediately if the start date is already due.
  await materializeRecurring(input.groupId);

  revalidatePath(`/groups/${input.groupId}`);
  return { ok: true };
}

export async function deleteRecurring(id: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." };

  const tpl = await prisma.recurringExpense.findUnique({
    where: { id },
    include: { group: { include: { members: true } } },
  });
  if (!tpl || !tpl.group.members.some((m) => m.userId === session.user.id))
    return { ok: false, error: "Kayıt bulunamadı." };
  if (tpl.payerId !== session.user.id && tpl.group.createdById !== session.user.id)
    return { ok: false, error: "Bunu silme yetkiniz yok." };

  await prisma.recurringExpense.delete({ where: { id } });
  revalidatePath(`/groups/${tpl.groupId}`);
  return { ok: true };
}
