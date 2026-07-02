"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { auth } from "./auth";
import { randomBytes } from "crypto";
import { equalShares, calculateSettlement } from "./settlement";
import { logActivity } from "./activity";
import { saveReceipt } from "./uploads";

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
  splitType: "Equal" | "Exact";
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

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/dashboard");
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
