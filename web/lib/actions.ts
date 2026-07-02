"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { auth } from "./auth";
import { equalShares, calculateSettlement } from "./settlement";

export type ActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  groupId?: string;
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
  amount: number;
  payerId: string;
  date: string;
  splitType: "Equal" | "Exact";
  participantIds: string[];
  exactAmounts?: Record<string, number>;
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

  await prisma.expense.create({
    data: {
      groupId: input.groupId,
      payerId: input.payerId,
      amount,
      description: input.description.trim(),
      category: input.category?.trim() || null,
      date: new Date(input.date),
      splitType: input.splitType,
      shares: { create: shares },
    },
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
  });
  if (!settlement) return { ok: false, error: "Kayıt bulunamadı." };

  if (session.user.id !== settlement.toUserId)
    return {
      ok: false,
      error: "Bu ödemeyi yalnızca alacaklı geri alabilir.",
    };

  await prisma.settlement.delete({ where: { id: settlementId } });
  revalidatePath(`/groups/${settlement.groupId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}
