"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { auth } from "./auth";
import { randomBytes } from "crypto";
import { equalShares, calculateSettlement } from "./settlement";
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
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Geçerli bir e-posta adresi girin."),
  displayName: z
    .string()
    .trim()
    .min(3, "En az 3 karakter")
    .max(100, "En fazla 100 karakter"),
  password: z.string().min(8, "En az 8 karakter"),
});

export async function registerUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    username: formData.get("username"),
    email: formData.get("email"),
    displayName: formData.get("displayName"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const issue of parsed.error.issues) fe[String(issue.path[0])] = issue.message;
    return { ok: false, fieldErrors: fe };
  }

  // Case-insensitive uniqueness: "Ozgur" and "ozgur" are the same account.
  const existing = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "User" WHERE LOWER(username) = LOWER(${parsed.data.username}) LIMIT 1`;
  if (existing.length > 0)
    return {
      ok: false,
      fieldErrors: { username: "Bu kullanıcı adı zaten alınmış." },
    };

  const emailTaken = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (emailTaken)
    return {
      ok: false,
      fieldErrors: { email: "Bu e-posta adresi zaten kayıtlı." },
    };

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.create({
    data: {
      username: parsed.data.username,
      email: parsed.data.email,
      displayName: parsed.data.displayName,
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
      type: "Tatil",
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
    include: { group: true },
  });
  if (!member) return { ok: false, error: "Bu gruba erişiminiz yok." };
  if (member.group.type === "Kisisel")
    return { ok: false, error: "Kişisel bütçe grubuna üye eklenemez." };
  if (member.group.archivedAt)
    return { ok: false, error: "Grup arşivde; üye eklenemez." };

  const name = username.trim();
  if (!name) return { ok: false, error: "Kullanıcı adı boş olamaz." };

  const user = await prisma.user.findUnique({ where: { username: name } });
  if (!user) return { ok: false, error: `'${name}' bulunamadı.` };
  if (user.id === session.user.id)
    return { ok: false, error: "Kendini davet edemezsin." };

  const already = await prisma.groupMember.findFirst({
    where: { groupId, userId: user.id },
  });
  if (already) return { ok: false, error: `'${name}' zaten grupta.` };

  // --- Sosyal huzur kuralları -------------------------------------------
  const block = await prisma.userAddBlock.findUnique({
    where: {
      blockerId_blockedId: { blockerId: user.id, blockedId: session.user.id },
    },
  });
  if (block?.permanent)
    return {
      ok: false,
      error: `'${name}' taleplerini kalıcı olarak reddetti; bu kullanıcıyı gruba ekleyemezsin.`,
    };
  if (block?.until && block.until > new Date()) {
    const hours = Math.ceil((block.until.getTime() - Date.now()) / 3_600_000);
    return {
      ok: false,
      error: `Taleplerini çok reddettiği için '${name}' kullanıcısını ~${hours} saat boyunca gruba ekleyemezsin.`,
    };
  }

  const pendingSame = await prisma.groupJoinRequest.findFirst({
    where: { groupId, toUserId: user.id, status: "pending" },
  });
  if (pendingSame)
    return { ok: false, error: `'${name}' için bu grupta zaten bekleyen bir davet var.` };

  const pendingCount = await prisma.groupJoinRequest.count({
    where: {
      fromUserId: session.user.id,
      toUserId: user.id,
      status: "pending",
    },
  });
  if (pendingCount >= 10)
    return {
      ok: false,
      error: `'${name}' için 10 bekleyen talebin var; yanıtlanmadan yenisini gönderemezsin.`,
    };
  // ----------------------------------------------------------------------

  const groupInfo = await prisma.group.findUnique({ where: { id: groupId } });
  const request = await prisma.groupJoinRequest.create({
    data: { groupId, fromUserId: session.user.id, toUserId: user.id },
  });

  await notify({
    userId: user.id,
    type: "member.request",
    title: `"${groupInfo?.name ?? "Bir grup"}" grubuna davet edildin`,
    body: `${session.user.name ?? "Bir kullanıcı"} seni eklemek istiyor. Onaylarsan gruba katılırsın.`,
    groupId,
    meta: { requestId: request.id },
  });

  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}

/**
 * The invited user accepts or rejects a pending join request. Rejections feed
 * the anti-harassment counters: 5 rejections => requester gets a 24h add-ban
 * (with a warning); 5 more after the ban => permanent ban.
 */
export async function respondJoinRequest(
  requestId: string,
  accept: boolean,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." };

  const request = await prisma.groupJoinRequest.findUnique({
    where: { id: requestId },
    include: { group: true, from: true },
  });
  if (!request || request.toUserId !== session.user.id)
    return { ok: false, error: "Talep bulunamadı." };
  if (request.status !== "pending") {
    // Stale notification: clean it up quietly.
    await prisma.notification.deleteMany({
      where: {
        userId: session.user.id,
        type: "member.request",
        meta: JSON.stringify({ requestId }),
      },
    });
    return { ok: false, error: "Bu talep zaten yanıtlanmış." };
  }

  await prisma.groupJoinRequest.update({
    where: { id: requestId },
    data: {
      status: accept ? "accepted" : "rejected",
      respondedAt: new Date(),
    },
  });
  // The actionable notification is consumed either way.
  await prisma.notification.deleteMany({
    where: {
      userId: session.user.id,
      type: "member.request",
      meta: JSON.stringify({ requestId }),
    },
  });

  const myName = session.user.name ?? "Kullanıcı";

  if (accept) {
    if (request.group.archivedAt)
      return { ok: false, error: "Grup arşivlendiği için katılamazsın." };
    const already = await prisma.groupMember.findFirst({
      where: { groupId: request.groupId, userId: session.user.id },
    });
    if (!already) {
      await prisma.groupMember.create({
        data: { groupId: request.groupId, userId: session.user.id },
      });
    }
    await logActivity({
      groupId: request.groupId,
      actorId: session.user.id,
      type: "member.add",
      summary: `${myName} daveti kabul edip gruba katıldı`,
    });
    await notify({
      userId: request.fromUserId,
      type: "member.add",
      title: `${myName} davetini kabul etti`,
      body: `"${request.group.name}" grubuna katıldı.`,
      groupId: request.groupId,
    });
    revalidatePath(`/groups/${request.groupId}`);
    revalidatePath("/groups");
    return { ok: true, groupId: request.groupId };
  }

  // --- Rejection penalties ----------------------------------------------
  const pair = {
    blockerId: session.user.id, // rejecter
    blockedId: request.fromUserId, // requester
  };
  const existingBlock = await prisma.userAddBlock.findUnique({
    where: { blockerId_blockedId: pair },
  });
  if (!existingBlock?.permanent) {
    const lastAccept = await prisma.groupJoinRequest.findFirst({
      where: {
        fromUserId: request.fromUserId,
        toUserId: session.user.id,
        status: "accepted",
      },
      orderBy: { respondedAt: "desc" },
    });
    // Streak restarts after the previous penalty or the last acceptance.
    const anchor = new Date(
      Math.max(
        existingBlock?.createdAt.getTime() ?? 0,
        lastAccept?.respondedAt?.getTime() ?? 0,
      ),
    );
    const rejectionStreak = await prisma.groupJoinRequest.count({
      where: {
        fromUserId: request.fromUserId,
        toUserId: session.user.id,
        status: "rejected",
        respondedAt: { gt: anchor },
      },
    });

    if (rejectionStreak >= 5) {
      if (existingBlock) {
        // Second strike after a served 24h ban: permanent.
        await prisma.userAddBlock.update({
          where: { blockerId_blockedId: pair },
          data: { permanent: true, until: null, createdAt: new Date() },
        });
        await notify({
          userId: request.fromUserId,
          type: "member.add",
          title: "Grup ekleme engeli (kalıcı)",
          body: `${myName}, taleplerini tekrar tekrar reddetti. Bu kullanıcıyı artık hiçbir gruba ekleyemezsin.`,
        });
      } else {
        await prisma.userAddBlock.create({
          data: { ...pair, until: new Date(Date.now() + 24 * 3_600_000) },
        });
        await notify({
          userId: request.fromUserId,
          type: "member.add",
          title: "Grup ekleme engeli (24 saat)",
          body: `${myName}, taleplerini 5 kez reddetti. 24 saat boyunca bu kullanıcıyı hiçbir gruba ekleyemezsin.`,
        });
      }
    }
  }

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
  /** "income" only allowed in personal budget groups. */
  kind?: "expense" | "income";
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
  if (group.archivedAt)
    return { ok: false, error: "Grup arşivde; değişiklik yapılamaz." };

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

  const kind = input.kind === "income" ? "income" : "expense";
  if (kind === "income" && group.type !== "Kisisel")
    return { ok: false, error: "Gelir yalnızca kişisel bütçeye eklenebilir." };

  let shares: { userId: string; amount: number }[];
  if (kind === "income") {
    // Income is balance-neutral: the payer "receives" their own amount.
    shares = [{ userId: input.payerId, amount }];
  } else if (input.splitType === "Exact") {
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
      kind,
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
    summary:
      kind === "income"
        ? `"${created.description}" geliri eklendi`
        : `"${created.description}" harcaması eklendi`,
    meta: { amount, expenseId: created.id },
  });

  if (group.type !== "Kisisel") {
    await notifyGroupMembers({
      groupId: input.groupId,
      exceptUserId: session.user.id,
      type: "expense.add",
      title: `${session.user.name ?? "Bir üye"} harcama ekledi`,
      body: `"${created.description}" — ${amount.toFixed(2)} ${group.currency}`,
    });
  }

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
  if (expense.group.archivedAt)
    return { ok: false, error: "Grup arşivde; değişiklik yapılamaz." };

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
  if (group.archivedAt)
    return { ok: false, error: "Grup arşivde; değişiklik yapılamaz." };

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
  if (group.archivedAt)
    return { ok: false, error: "Grup arşivde; değişiklik yapılamaz." };

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
// displayName intentionally absent: it is set at registration and immutable.
const profileSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine(
      (s) => s === "" || z.string().email().safeParse(s).success,
      "Geçerli bir e-posta adresi girin.",
    )
    .optional(),
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
    email: (formData.get("email") as string | null) ?? undefined,
    iban: formData.get("iban") || undefined,
    ibanName: formData.get("ibanName") || undefined,
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const issue of parsed.error.issues) fe[String(issue.path[0])] = issue.message;
    return { ok: false, fieldErrors: fe };
  }

  const email = parsed.data.email || null;
  if (email) {
    const taken = await prisma.user.findFirst({
      where: { email, id: { not: session.user.id } },
    });
    if (taken)
      return {
        ok: false,
        fieldErrors: { email: "Bu e-posta başka bir hesapta kayıtlı." },
      };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      email,
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
  if (expense.group.archivedAt)
    return { ok: false, error: "Grup arşivde; değişiklik yapılamaz." };

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
    include: { group: true },
  });
  if (!member) return { ok: false, error: "Bu gruba erişiminiz yok." };
  if (member.group.type === "Kisisel")
    return { ok: false, error: "Kişisel bütçe grubuna davet oluşturulamaz." };
  if (member.group.archivedAt)
    return { ok: false, error: "Grup arşivde; davet oluşturulamaz." };

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

  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { group: true },
  });
  if (!invite || !invite.active)
    return { ok: false, error: "Davet linki geçersiz." };
  if (invite.group.type === "Kisisel")
    return { ok: false, error: "Bu gruba katılım kapalı." };
  if (invite.group.archivedAt)
    return { ok: false, error: "Bu grup arşivlendi; katılım kapalı." };
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
// Remove a member (owner only) — for accidental adds
// ---------------------------------------------------------------------------
export async function removeMember(
  groupId: string,
  memberUserId: string,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." };

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: { include: { user: true } } },
  });
  if (!group) return { ok: false, error: "Grup bulunamadı." };
  if (group.createdById !== session.user.id)
    return { ok: false, error: "Üyeyi yalnızca grubu kuran kişi çıkarabilir." };
  if (memberUserId === group.createdById)
    return { ok: false, error: "Grup sahibi çıkarılamaz." };

  const member = group.members.find((m) => m.userId === memberUserId);
  if (!member) return { ok: false, error: "Üye bulunamadı." };

  // Guard the ledger: a member with financial records can't be removed.
  const [expenseCount, shareCount, settlementCount] = await Promise.all([
    prisma.expense.count({ where: { groupId, payerId: memberUserId } }),
    prisma.expenseShare.count({
      where: { userId: memberUserId, expense: { groupId } },
    }),
    prisma.settlement.count({
      where: {
        groupId,
        OR: [{ fromUserId: memberUserId }, { toUserId: memberUserId }],
      },
    }),
  ]);
  if (expenseCount + shareCount + settlementCount > 0)
    return {
      ok: false,
      error:
        "Bu üyenin harcama/ödeme kayıtları var; çıkarılamaz. (Yanlış eklenen üyeler ancak kayıt oluşmadan çıkarılabilir.)",
    };

  await prisma.groupMember.deleteMany({
    where: { groupId, userId: memberUserId },
  });

  const removedName = member.user.displayName ?? member.user.username;
  await logActivity({
    groupId,
    actorId: session.user.id,
    type: "member.add",
    summary: `${removedName} gruptan çıkarıldı`,
  });
  await notify({
    userId: memberUserId,
    type: "member.add",
    title: `"${group.name}" grubundan çıkarıldın`,
    body: `${session.user.name ?? "Grup sahibi"} seni gruptan çıkardı.`,
  });

  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Archive / unarchive (owner only) & leave group
// ---------------------------------------------------------------------------
export async function setGroupArchived(
  groupId: string,
  archived: boolean,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." };

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) return { ok: false, error: "Grup bulunamadı." };
  if (group.createdById !== session.user.id)
    return { ok: false, error: "Bunu yalnızca grup sahibi yapabilir." };
  if (group.type === "Kisisel")
    return { ok: false, error: "Kişisel bütçe arşivlenemez." };

  await prisma.group.update({
    where: { id: groupId },
    data: { archivedAt: archived ? new Date() : null },
  });

  await logActivity({
    groupId,
    actorId: session.user.id,
    type: "group.create",
    summary: archived ? "Grup arşivlendi" : "Grup arşivden çıkarıldı",
  });

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * A member leaves the group voluntarily. Blocked for the owner and for
 * members with an unsettled balance (their departure would corrupt the ledger).
 */
export async function leaveGroup(groupId: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." };
  const userId = session.user.id;

  const group = await prisma.group.findFirst({
    where: { id: groupId, members: { some: { userId } } },
    include: {
      members: { include: { user: true } },
      expenses: { include: { shares: true } },
      settlements: true,
    },
  });
  if (!group) return { ok: false, error: "Grup bulunamadı." };
  if (group.type === "Kisisel")
    return { ok: false, error: "Kişisel bütçeden ayrılamazsın." };
  if (group.createdById === userId)
    return {
      ok: false,
      error: "Grup sahibi ayrılamaz. İstersen grubu arşivleyebilir veya silebilirsin.",
    };

  const { balances } = calculateSettlement({
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
  const myBalance = balances.find((b) => b.userId === userId)?.amount ?? 0;
  if (Math.abs(myBalance) > 0.005)
    return {
      ok: false,
      error:
        "Açık borcun/alacağın varken gruptan ayrılamazsın. Önce ödeşmeyi tamamla.",
    };

  await prisma.groupMember.deleteMany({ where: { groupId, userId } });

  const name = session.user.name ?? "Bir üye";
  await logActivity({
    groupId,
    actorId: userId,
    type: "member.add",
    summary: `${name} gruptan ayrıldı`,
  });
  await notify({
    userId: group.createdById,
    type: "member.add",
    title: `${name} "${group.name}" grubundan ayrıldı`,
    groupId,
  });

  revalidatePath("/groups");
  revalidatePath("/dashboard");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Group deletion (owner only) & personal budget
// ---------------------------------------------------------------------------
export async function deleteGroup(groupId: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." };

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) return { ok: false, error: "Grup bulunamadı." };
  if (group.createdById !== session.user.id)
    return { ok: false, error: "Grubu yalnızca kuran kişi silebilir." };

  await prisma.group.delete({ where: { id: groupId } }); // cascades everything

  revalidatePath("/groups");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Finds (or creates) the user's single personal budget group. */
export async function ensurePersonalBudget(): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Oturum bulunamadı." };

  const existing = await prisma.group.findFirst({
    where: {
      type: "Kisisel",
      createdById: session.user.id,
      members: { some: { userId: session.user.id } },
    },
  });
  if (existing) return { ok: true, groupId: existing.id };

  const group = await prisma.group.create({
    data: {
      name: "Kişisel Bütçe",
      type: "Kisisel",
      currency: "TRY",
      createdById: session.user.id,
      members: { create: { userId: session.user.id } },
    },
  });

  return { ok: true, groupId: group.id };
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
  if (group.archivedAt)
    return { ok: false, error: "Grup arşivde; değişiklik yapılamaz." };

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
