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
import { saveReceipt, saveAvatar } from "./uploads";
import { materializeRecurring } from "./recurring";
import { isCurrencyCode } from "./currencies";
import { requireAdmin } from "./admin";
import { getT } from "./i18n/server";
import { getEffectivePremium } from "./premium";

// Sunucu mesajları istek anındaki dile göre çevrilir (varsayılan EN).
const t = (key: string, params?: Record<string, string | number>) =>
  getT()(key, params);

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
      fieldErrors: { username: t("Bu kullanıcı adı zaten alınmış.") },
    };

  const emailTaken = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (emailTaken)
    return {
      ok: false,
      fieldErrors: { email: t("Bu e-posta adresi zaten kayıtlı.") },
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

  // Doğrulama kodu gönder; e-posta hatası kaydı engellemez (tekrar istenebilir).
  try {
    const { issueEmailCode } = await import("./email-codes");
    const res = await issueEmailCode(parsed.data.email, "verify");
    if (res !== "ok")
      console.error(`register: verify code not sent (${res}) email=${parsed.data.email}`);
  } catch (e) {
    console.error("register: verify code send failed", e);
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// E-posta doğrulama + şifre sıfırlama
// ---------------------------------------------------------------------------

/** Oturumdaki kullanıcıya yeni doğrulama kodu gönderir. */
export async function resendVerificationCode(): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: t("Oturum bulunamadı.") };
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, emailVerified: true },
  });
  if (!user?.email) return { ok: false, error: t("Hesabında kayıtlı e-posta yok.") };
  if (user.emailVerified) return { ok: true };

  const { issueEmailCode } = await import("./email-codes");
  const res = await issueEmailCode(user.email, "verify");
  if (res === "rate_limited")
    return { ok: false, error: t("Çok sık kod istendi. Lütfen 1 saat sonra tekrar dene.") };
  if (res === "send_failed")
    return { ok: false, error: t("E-posta gönderilemedi. Lütfen daha sonra tekrar dene.") };
  return { ok: true };
}

/** Oturumdaki kullanıcının e-postasını 6 haneli kodla doğrular. */
export async function confirmEmailCode(code: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: t("Oturum bulunamadı.") };
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, emailVerified: true },
  });
  if (!user?.email) return { ok: false, error: t("Hesabında kayıtlı e-posta yok.") };
  if (user.emailVerified) return { ok: true };

  const { checkEmailCode } = await import("./email-codes");
  const res = await checkEmailCode(user.email, "verify", code);
  if (res === "expired")
    return { ok: false, error: t("Kodun süresi dolmuş; yeni kod iste.") };
  if (res === "too_many")
    return { ok: false, error: t("Çok fazla yanlış deneme; yeni kod iste.") };
  if (res !== "ok") return { ok: false, error: t("Kod hatalı.") };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { emailVerified: new Date() },
  });
  return { ok: true };
}

/** Şifre sıfırlama kodu ister. Hesap var/yok bilgisi sızdırılmaz. */
export async function requestPasswordReset(email: string): Promise<ActionState> {
  const parsed = z.string().trim().toLowerCase().email().safeParse(email);
  if (!parsed.success)
    return { ok: false, error: t("Geçerli bir e-posta adresi girin.") };

  const user = await prisma.user.findUnique({ where: { email: parsed.data } });
  if (user) {
    const { issueEmailCode } = await import("./email-codes");
    const res = await issueEmailCode(parsed.data, "reset");
    if (res === "rate_limited")
      return { ok: false, error: t("Çok sık kod istendi. Lütfen 1 saat sonra tekrar dene.") };
  }
  // Kayıtlı olsun olmasın aynı mesaj (hesap taraması engellenir).
  return { ok: true };
}

/** Kod + yeni parola ile şifreyi sıfırlar. */
export async function resetPasswordWithCode(input: {
  email: string;
  code: string;
  password: string;
}): Promise<ActionState> {
  const email = z.string().trim().toLowerCase().email().safeParse(input.email);
  if (!email.success)
    return { ok: false, error: t("Geçerli bir e-posta adresi girin.") };
  if (typeof input.password !== "string" || input.password.length < 8)
    return { ok: false, error: t("Parola en az 8 karakter olmalı.") };

  const user = await prisma.user.findUnique({ where: { email: email.data } });
  if (!user) return { ok: false, error: t("Kod hatalı.") };

  const { checkEmailCode } = await import("./email-codes");
  const res = await checkEmailCode(email.data, "reset", input.code);
  if (res === "expired")
    return { ok: false, error: t("Kodun süresi dolmuş; yeni kod iste.") };
  if (res === "too_many")
    return { ok: false, error: t("Çok fazla yanlış deneme; yeni kod iste.") };
  if (res !== "ok") return { ok: false, error: t("Kod hatalı.") };

  const passwordHash = await bcrypt.hash(input.password, 12);
  await prisma.user.update({
    where: { id: user.id },
    // Kod e-posta sahipliğini kanıtlar → e-posta da doğrulanmış sayılır.
    data: { passwordHash, emailVerified: user.emailVerified ?? new Date() },
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------
const groupSchema = z.object({
  name: z.string().trim().min(1, "Grup adı gerekli").max(100),
  currency: z.string().refine(isCurrencyCode, "Geçersiz para birimi"),
});

export async function createGroup(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: t("Oturum bulunamadı.") };

  const parsed = groupSchema.safeParse({
    name: formData.get("name"),
    currency: formData.get("currency"),
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const issue of parsed.error.issues) fe[String(issue.path[0])] = issue.message;
    return { ok: false, fieldErrors: fe };
  }

  // Free sürüm limiti: kullanıcı başına 1 grup (kişisel bütçe hariç).
  if (!(await getEffectivePremium(session.user.id))) {
    const owned = await prisma.group.count({
      where: { createdById: session.user.id, type: { not: "Kisisel" } },
    });
    if (owned >= 1)
      return {
        ok: false,
        error:
          t("Ücretsiz sürümde yalnızca 1 grup kurabilirsin. Sınırsız grup için sağ üst menüden Premium'a göz at."),
      };
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
    summary: t('"{name}" grubu oluşturuldu', { name: group.name }),
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
  if (!session?.user?.id) return { ok: false, error: t("Oturum bulunamadı.") };

  const member = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id },
    include: { group: true },
  });
  if (!member) return { ok: false, error: t("Bu gruba erişiminiz yok.") };
  if (member.group.type === "Kisisel")
    return { ok: false, error: t("Kişisel bütçe grubuna üye eklenemez.") };
  if (member.group.archivedAt)
    return { ok: false, error: t("Grup arşivde; üye eklenemez.") };

  const name = username.trim();
  if (!name) return { ok: false, error: t("Kullanıcı adı boş olamaz.") };

  const user = await prisma.user.findUnique({ where: { username: name } });
  if (!user) return { ok: false, error: t("'{name}' bulunamadı.", { name }) };
  if (user.id === session.user.id)
    return { ok: false, error: t("Kendini davet edemezsin.") };

  const already = await prisma.groupMember.findFirst({
    where: { groupId, userId: user.id },
  });
  if (already) return { ok: false, error: t("'{name}' zaten grupta.", { name }) };

  // --- Sosyal huzur kuralları -------------------------------------------
  const block = await prisma.userAddBlock.findUnique({
    where: {
      blockerId_blockedId: { blockerId: user.id, blockedId: session.user.id },
    },
  });
  if (block?.permanent)
    return {
      ok: false,
      error: t("'{name}' taleplerini kalıcı olarak reddetti; bu kullanıcıyı gruba ekleyemezsin.", { name }),
    };
  if (block?.until && block.until > new Date()) {
    const hours = Math.ceil((block.until.getTime() - Date.now()) / 3_600_000);
    return {
      ok: false,
      error: t("Taleplerini çok reddettiği için '{name}' kullanıcısını ~{hours} saat boyunca gruba ekleyemezsin.", { name, hours }),
    };
  }

  const pendingSame = await prisma.groupJoinRequest.findFirst({
    where: { groupId, toUserId: user.id, status: "pending" },
  });
  if (pendingSame)
    return { ok: false, error: t("'{name}' için bu grupta zaten bekleyen bir davet var.", { name }) };

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
      error: t("'{name}' için 10 bekleyen talebin var; yanıtlanmadan yenisini gönderemezsin.", { name }),
    };
  // ----------------------------------------------------------------------

  const groupInfo = await prisma.group.findUnique({ where: { id: groupId } });
  const request = await prisma.groupJoinRequest.create({
    data: { groupId, fromUserId: session.user.id, toUserId: user.id },
  });

  await notify({
    userId: user.id,
    type: "member.request",
    title: t('"{group}" grubuna davet edildin', { group: groupInfo?.name ?? t("Bir grup") }),
    body: t("{name} seni eklemek istiyor. Onaylarsan gruba katılırsın.", { name: session.user.name ?? t("Bir kullanıcı") }),
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
  if (!session?.user?.id) return { ok: false, error: t("Oturum bulunamadı.") };

  const request = await prisma.groupJoinRequest.findUnique({
    where: { id: requestId },
    include: { group: true, from: true },
  });
  if (!request || request.toUserId !== session.user.id)
    return { ok: false, error: t("Talep bulunamadı.") };
  if (request.status !== "pending") {
    // Stale notification: clean it up quietly.
    await prisma.notification.deleteMany({
      where: {
        userId: session.user.id,
        type: "member.request",
        meta: JSON.stringify({ requestId }),
      },
    });
    return { ok: false, error: t("Bu talep zaten yanıtlanmış.") };
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

  const myName = session.user.name ?? t("Kullanıcı");

  if (accept) {
    if (request.group.archivedAt)
      return { ok: false, error: t("Grup arşivlendiği için katılamazsın.") };
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
      summary: t("{name} daveti kabul edip gruba katıldı", { name: myName }),
    });
    await notify({
      userId: request.fromUserId,
      type: "member.add",
      title: t("{name} davetini kabul etti", { name: myName }),
      body: t('"{group}" grubuna katıldı.', { group: request.group.name }),
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
          title: t("Grup ekleme engeli (kalıcı)"),
          body: t("{name}, taleplerini tekrar tekrar reddetti. Bu kullanıcıyı artık hiçbir gruba ekleyemezsin.", { name: myName }),
        });
      } else {
        await prisma.userAddBlock.create({
          data: { ...pair, until: new Date(Date.now() + 24 * 3_600_000) },
        });
        await notify({
          userId: request.fromUserId,
          type: "member.add",
          title: t("Grup ekleme engeli (24 saat)"),
          body: t("{name}, taleplerini 5 kez reddetti. 24 saat boyunca bu kullanıcıyı hiçbir gruba ekleyemezsin.", { name: myName }),
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
  if (!session?.user?.id) return { ok: false, error: t("Oturum bulunamadı.") };

  const group = await prisma.group.findFirst({
    where: { id: input.groupId, members: { some: { userId: session.user.id } } },
    include: { members: true },
  });
  if (!group) return { ok: false, error: t("Bu gruba erişiminiz yok.") };
  if (group.archivedAt)
    return { ok: false, error: t("Grup arşivde; değişiklik yapılamaz.") };

  const memberIds = new Set(group.members.map((m) => m.userId));
  const participants = [...new Set(input.participantIds)].filter((id) =>
    memberIds.has(id),
  );

  const amount = Math.round(input.amount * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0)
    return { ok: false, error: t("Tutar 0'dan büyük olmalı.") };
  if (!input.description.trim())
    return { ok: false, error: t("Açıklama gerekli.") };
  if (!memberIds.has(input.payerId))
    return { ok: false, error: t("Ödeyen grup üyesi olmalı.") };
  if (participants.length === 0)
    return { ok: false, error: t("En az bir katılımcı seçmelisiniz.") };

  const kind = input.kind === "income" ? "income" : "expense";
  if (kind === "income" && group.type !== "Kisisel")
    return { ok: false, error: t("Gelir yalnızca kişisel bütçeye eklenebilir.") };

  // Free sürüm limiti: kurucusu premium olmayan grupta en fazla 3 harcama
  // (kim eklerse eklesin). Kişisel bütçe sınırsızdır.
  if (group.type !== "Kisisel") {
    if (!(await getEffectivePremium(group.createdById))) {
      const expenseCount = await prisma.expense.count({
        where: { groupId: group.id },
      });
      if (expenseCount >= 3)
        return {
          ok: false,
          error:
            t("Ücretsiz sürümde bir grupta en fazla 3 harcama olabilir. Sınırsız harcama için grup kurucusunun Premium'a geçmesi gerekir (sağ üst menü → Premium)."),
        };
    }
  }

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
        error: t("Payların toplamı ({sum}) tutara ({amount}) eşit olmalı.", { sum: sum.toFixed(2), amount: amount.toFixed(2) }),
      };
  } else {
    shares = equalShares(amount, participants);
  }

  const hasFx =
    isCurrencyCode(input.originalCurrency) &&
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
      title: t("{name} harcama ekledi", { name: session.user.name ?? t("Bir üye") }),
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
  if (!session?.user?.id) return { ok: false, error: t("Oturum bulunamadı.") };

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { group: { include: { members: true } } },
  });
  if (
    !expense ||
    !expense.group.members.some((m) => m.userId === session.user.id)
  )
    return { ok: false, error: t("Harcama bulunamadı.") };

  if (
    expense.payerId !== session.user.id &&
    expense.group.createdById !== session.user.id
  )
    return { ok: false, error: t("Bu harcamayı silme yetkiniz yok.") };
  if (expense.group.archivedAt)
    return { ok: false, error: t("Grup arşivde; değişiklik yapılamaz.") };

  await prisma.expense.delete({ where: { id: expenseId } });
  await logActivity({
    groupId: expense.groupId,
    actorId: session.user.id,
    type: "expense.delete",
    summary: t('"{desc}" harcaması silindi', { desc: expense.description }),
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
  if (!session?.user?.id) return { ok: false, error: t("Oturum bulunamadı.") };

  // Only the creditor (receiver) can confirm payment.
  if (session.user.id !== toUserId)
    return {
      ok: false,
      error: t("Bu borcu yalnızca alacaklı (parayı alan kişi) ödendi işaretleyebilir."),
    };

  const group = await prisma.group.findFirst({
    where: { id: groupId, members: { some: { userId: session.user.id } } },
    include: {
      members: { include: { user: true } },
      expenses: { include: { shares: true } },
      settlements: true,
    },
  });
  if (!group) return { ok: false, error: t("Bu gruba erişiminiz yok.") };
  if (group.archivedAt)
    return { ok: false, error: t("Grup arşivde; değişiklik yapılamaz.") };

  const memberIds = new Set(group.members.map((m) => m.userId));
  if (!memberIds.has(fromUserId) || !memberIds.has(toUserId))
    return { ok: false, error: t("Geçersiz üye.") };

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
    return { ok: false, error: t("Bu borç güncel değil ya da zaten kapanmış.") };

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
    summary: t("{from} → {to}: ödeme alındı ({amount})", { from: transfer.fromUserName, to: transfer.toUserName, amount: transfer.amount.toFixed(2) }),
    meta: { fromUserId, toUserId, amount: transfer.amount },
  });

  await notify({
    userId: fromUserId,
    type: "settle",
    title: t("{name} ödemeni onayladı", { name: transfer.toUserName }),
    body: t("{amount} tutarındaki borcun kapandı. 🎉", { amount: transfer.amount.toFixed(2) }),
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
  if (!session?.user?.id) return { ok: false, error: t("Oturum bulunamadı.") };
  const toUserId = session.user.id; // only the creditor can remind

  const group = await prisma.group.findFirst({
    where: { id: groupId, members: { some: { userId: toUserId } } },
    include: {
      members: { include: { user: true } },
      expenses: { include: { shares: true } },
      settlements: true,
    },
  });
  if (!group) return { ok: false, error: t("Bu gruba erişiminiz yok.") };
  if (group.archivedAt)
    return { ok: false, error: t("Grup arşivde; değişiklik yapılamaz.") };

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
  if (!transfer) return { ok: false, error: t("Bu borç güncel değil.") };

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
      error: t("Bu borç için bugün zaten hatırlatma gönderdin (günde 1 kez)."),
    };

  await notify({
    userId: fromUserId,
    type: "payment.reminder",
    title: t("{name} borcunu hatırlattı", { name: transfer.toUserName }),
    body: t('"{group}" grubunda {amount} {cur} borcun var.', { group: group.name, amount: transfer.amount.toFixed(2), cur: group.currency }),
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
  if (!session?.user?.id) return { ok: false, error: t("Oturum bulunamadı.") };

  const settlement = await prisma.settlement.findUnique({
    where: { id: settlementId },
    include: { fromUser: true, toUser: true },
  });
  if (!settlement) return { ok: false, error: t("Kayıt bulunamadı.") };

  if (session.user.id !== settlement.toUserId)
    return {
      ok: false,
      error: t("Bu ödemeyi yalnızca alacaklı geri alabilir."),
    };

  await prisma.settlement.delete({ where: { id: settlementId } });
  await logActivity({
    groupId: settlement.groupId,
    actorId: session.user.id,
    type: "unsettle",
    summary: t("{from} → {to} ödemesi geri alındı", { from: settlement.fromUser.displayName ?? settlement.fromUser.username, to: settlement.toUser.displayName ?? settlement.toUser.username }),
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

/** Profil fotoğrafı yükler (herkese açık özellik). */
export async function updateAvatar(formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: t("Oturum bulunamadı.") };

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: t("Bir fotoğraf seçmelisin.") };

  const saved = await saveAvatar(session.user.id, file);
  if (!saved.ok) return saved;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarPath: saved.filename },
  });
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Profil fotoğrafını kaldırır (baş harflere geri dönülür). */
export async function removeAvatar(): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: t("Oturum bulunamadı.") };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarPath: null },
  });
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: t("Oturum bulunamadı.") };

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
        fieldErrors: { email: t("Bu e-posta başka bir hesapta kayıtlı.") },
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
  if (!session?.user?.id) return { ok: false, error: t("Oturum bulunamadı.") };

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (next.length < 8)
    return { ok: false, fieldErrors: { newPassword: t("En az 8 karakter olmalı.") } };
  if (next !== confirm)
    return { ok: false, fieldErrors: { confirmPassword: t("Parolalar eşleşmiyor.") } };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { ok: false, error: t("Kullanıcı bulunamadı.") };

  const valid = await bcrypt.compare(current, user.passwordHash);
  if (!valid)
    return { ok: false, fieldErrors: { currentPassword: t("Mevcut parola hatalı.") } };

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
  if (!session?.user?.id) return { ok: false, error: t("Oturum bulunamadı.") };

  const password = String(formData.get("password") ?? "");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { ok: false, error: t("Kullanıcı bulunamadı.") };

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid)
    return { ok: false, fieldErrors: { password: t("Parola hatalı.") } };

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
        displayName: t("Silinen Kullanıcı"),
        // E-posta ve tüm kişisel veriler temizlenir; aynı e-postayla
        // yeniden kayıt olunabilmeli.
        email: null,
        emailVerified: null,
        avatarPath: null,
        premium: false,
        premiumPlan: null,
        premiumSource: null,
        premiumUntil: null,
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
  if (!session?.user?.id) return { ok: false, error: t("Oturum bulunamadı.") };

  const expense = await prisma.expense.findUnique({
    where: { id: input.expenseId },
    include: { group: { include: { members: true } } },
  });
  if (
    !expense ||
    !expense.group.members.some((m) => m.userId === session.user.id)
  )
    return { ok: false, error: t("Harcama bulunamadı.") };
  if (
    expense.payerId !== session.user.id &&
    expense.group.createdById !== session.user.id
  )
    return { ok: false, error: t("Bu harcamayı düzenleme yetkiniz yok.") };
  if (expense.group.archivedAt)
    return { ok: false, error: t("Grup arşivde; değişiklik yapılamaz.") };

  const memberIds = new Set(expense.group.members.map((m) => m.userId));
  const participants = [...new Set(input.participantIds)].filter((id) =>
    memberIds.has(id),
  );
  const amount = Math.round(input.amount * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0)
    return { ok: false, error: t("Tutar 0'dan büyük olmalı.") };
  if (!input.description.trim()) return { ok: false, error: t("Açıklama gerekli.") };
  if (!memberIds.has(input.payerId))
    return { ok: false, error: t("Ödeyen grup üyesi olmalı.") };
  if (participants.length === 0)
    return { ok: false, error: t("En az bir katılımcı seçmelisiniz.") };

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
        error: t("Payların toplamı ({sum}) tutara ({amount}) eşit olmalı.", { sum: sum.toFixed(2), amount: amount.toFixed(2) }),
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
    summary: t('"{desc}" harcaması düzenlendi', { desc: input.description.trim() }),
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
  if (!session?.user?.id) return { ok: false, error: t("Oturum bulunamadı.") };

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { group: { include: { members: true } } },
  });
  if (
    !expense ||
    !expense.group.members.some((m) => m.userId === session.user.id)
  )
    return { ok: false, error: t("Harcama bulunamadı.") };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: t("Dosya seçilmedi.") };

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
  if (!session?.user?.id) return { ok: false, error: t("Oturum bulunamadı.") };

  const member = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id },
    include: { group: true },
  });
  if (!member) return { ok: false, error: t("Bu gruba erişiminiz yok.") };
  if (member.group.type === "Kisisel")
    return { ok: false, error: t("Kişisel bütçe grubuna davet oluşturulamaz.") };
  if (member.group.archivedAt)
    return { ok: false, error: t("Grup arşivde; davet oluşturulamaz.") };

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
  if (!session?.user?.id) return { ok: false, error: t("Oturum bulunamadı.") };

  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { group: true },
  });
  if (!invite || !invite.active)
    return { ok: false, error: t("Davet linki geçersiz.") };
  if (invite.group.type === "Kisisel")
    return { ok: false, error: t("Bu gruba katılım kapalı.") };
  if (invite.group.archivedAt)
    return { ok: false, error: t("Bu grup arşivlendi; katılım kapalı.") };
  if (invite.expiresAt && invite.expiresAt < new Date())
    return { ok: false, error: t("Davet linkinin süresi dolmuş.") };
  if (invite.maxUses != null && invite.uses >= invite.maxUses)
    return { ok: false, error: t("Davet linki kullanım limitine ulaşmış.") };

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
    summary: t("{name} davet linkiyle katıldı", { name: session.user.name ?? t("Bir kullanıcı") }),
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
  if (!session?.user?.id) return { ok: false, error: t("Oturum bulunamadı.") };

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: { include: { user: true } } },
  });
  if (!group) return { ok: false, error: t("Grup bulunamadı.") };
  if (group.createdById !== session.user.id)
    return { ok: false, error: t("Üyeyi yalnızca grubu kuran kişi çıkarabilir.") };
  if (memberUserId === group.createdById)
    return { ok: false, error: t("Grup sahibi çıkarılamaz.") };

  const member = group.members.find((m) => m.userId === memberUserId);
  if (!member) return { ok: false, error: t("Üye bulunamadı.") };

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
        t("Bu üyenin harcama/ödeme kayıtları var; çıkarılamaz. (Yanlış eklenen üyeler ancak kayıt oluşmadan çıkarılabilir.)"),
    };

  await prisma.groupMember.deleteMany({
    where: { groupId, userId: memberUserId },
  });

  const removedName = member.user.displayName ?? member.user.username;
  await logActivity({
    groupId,
    actorId: session.user.id,
    type: "member.add",
    summary: t("{name} gruptan çıkarıldı", { name: removedName }),
  });
  await notify({
    userId: memberUserId,
    type: "member.add",
    title: t('"{group}" grubundan çıkarıldın', { group: group.name }),
    body: t("{name} seni gruptan çıkardı.", { name: session.user.name ?? t("Grup sahibi") }),
  });

  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Rename group (owner only)
// ---------------------------------------------------------------------------
export async function renameGroup(
  groupId: string,
  name: string,
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: t("Oturum bulunamadı.") };

  const parsed = groupSchema.shape.name.safeParse(name);
  if (!parsed.success)
    return { ok: false, error: t(parsed.error.issues[0]?.message ?? "Geçersiz ad.") };

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) return { ok: false, error: t("Grup bulunamadı.") };
  if (group.createdById !== session.user.id)
    return { ok: false, error: t("Grup adını yalnızca grup sahibi değiştirebilir.") };
  if (group.type === "Kisisel")
    return { ok: false, error: t("Kişisel bütçenin adı değiştirilemez.") };
  if (group.archivedAt)
    return { ok: false, error: t("Grup arşivde; önce arşivden çıkar.") };
  if (parsed.data === group.name) return { ok: true };

  await prisma.group.update({
    where: { id: groupId },
    data: { name: parsed.data },
  });

  await logActivity({
    groupId,
    actorId: session.user.id,
    type: "group.create",
    summary: t('Grup adı "{old}" → "{new}" olarak değiştirildi', { old: group.name, new: parsed.data }),
  });
  await notifyGroupMembers({
    groupId,
    exceptUserId: session.user.id,
    type: "member.add",
    title: t("Grubun adı değişti"),
    body: t('"{old}" grubunun yeni adı: "{new}"', { old: group.name, new: parsed.data }),
  });

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
  revalidatePath("/dashboard");
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
  if (!session?.user?.id) return { ok: false, error: t("Oturum bulunamadı.") };

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) return { ok: false, error: t("Grup bulunamadı.") };
  if (group.createdById !== session.user.id)
    return { ok: false, error: t("Bunu yalnızca grup sahibi yapabilir.") };
  if (group.type === "Kisisel")
    return { ok: false, error: t("Kişisel bütçe arşivlenemez.") };

  await prisma.group.update({
    where: { id: groupId },
    data: { archivedAt: archived ? new Date() : null },
  });

  await logActivity({
    groupId,
    actorId: session.user.id,
    type: "group.create",
    summary: archived ? t("Grup arşivlendi") : t("Grup arşivden çıkarıldı"),
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
  if (!session?.user?.id) return { ok: false, error: t("Oturum bulunamadı.") };
  const userId = session.user.id;

  const group = await prisma.group.findFirst({
    where: { id: groupId, members: { some: { userId } } },
    include: {
      members: { include: { user: true } },
      expenses: { include: { shares: true } },
      settlements: true,
    },
  });
  if (!group) return { ok: false, error: t("Grup bulunamadı.") };
  if (group.type === "Kisisel")
    return { ok: false, error: t("Kişisel bütçeden ayrılamazsın.") };
  if (group.createdById === userId)
    return {
      ok: false,
      error: t("Grup sahibi ayrılamaz. İstersen grubu arşivleyebilir veya silebilirsin."),
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
        t("Açık borcun/alacağın varken gruptan ayrılamazsın. Önce ödeşmeyi tamamla."),
    };

  await prisma.groupMember.deleteMany({ where: { groupId, userId } });

  const name = session.user.name ?? t("Bir üye");
  await logActivity({
    groupId,
    actorId: userId,
    type: "member.add",
    summary: t("{name} gruptan ayrıldı", { name }),
  });
  await notify({
    userId: group.createdById,
    type: "member.add",
    title: t('{name} "{group}" grubundan ayrıldı', { name, group: group.name }),
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
  if (!session?.user?.id) return { ok: false, error: t("Oturum bulunamadı.") };

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) return { ok: false, error: t("Grup bulunamadı.") };
  if (group.createdById !== session.user.id)
    return { ok: false, error: t("Grubu yalnızca kuran kişi silebilir.") };

  await prisma.group.delete({ where: { id: groupId } }); // cascades everything

  revalidatePath("/groups");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Finds (or creates) the user's single personal budget group. */
export async function ensurePersonalBudget(): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: t("Oturum bulunamadı.") };

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
  if (!session?.user?.id) return { ok: false, error: t("Oturum bulunamadı.") };

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) return { ok: false, error: t("Grup bulunamadı.") };
  if (group.createdById !== session.user.id)
    return { ok: false, error: t("Bütçeyi yalnızca grup sahibi belirleyebilir.") };

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
    summary: value ? t("Aylık bütçe {x} olarak ayarlandı", { x: value.toFixed(2) }) : t("Aylık bütçe kaldırıldı"),
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
  if (!session?.user?.id) return { ok: false, error: t("Oturum bulunamadı.") };

  const group = await prisma.group.findFirst({
    where: { id: input.groupId, members: { some: { userId: session.user.id } } },
    include: { members: true },
  });
  if (!group) return { ok: false, error: t("Bu gruba erişiminiz yok.") };
  if (group.archivedAt)
    return { ok: false, error: t("Grup arşivde; değişiklik yapılamaz.") };

  const memberIds = new Set(group.members.map((m) => m.userId));
  const participants = [...new Set(input.participantIds)].filter((id) =>
    memberIds.has(id),
  );
  const amount = Math.round(input.amount * 100) / 100;
  if (!input.description.trim()) return { ok: false, error: t("Açıklama gerekli.") };
  if (!Number.isFinite(amount) || amount <= 0)
    return { ok: false, error: t("Tutar 0'dan büyük olmalı.") };
  if (!memberIds.has(input.payerId))
    return { ok: false, error: t("Ödeyen grup üyesi olmalı.") };
  if (participants.length === 0)
    return { ok: false, error: t("En az bir katılımcı seçmelisiniz.") };

  const start = new Date(input.startDate);
  if (Number.isNaN(start.getTime()))
    return { ok: false, error: t("Geçersiz başlangıç tarihi.") };

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
    summary: t('Tekrarlayan harcama eklendi: "{desc}"', { desc: input.description.trim() }),
  });

  // Materialize immediately if the start date is already due.
  await materializeRecurring(input.groupId);

  revalidatePath(`/groups/${input.groupId}`);
  return { ok: true };
}

export async function deleteRecurring(id: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: t("Oturum bulunamadı.") };

  const tpl = await prisma.recurringExpense.findUnique({
    where: { id },
    include: { group: { include: { members: true } } },
  });
  if (!tpl || !tpl.group.members.some((m) => m.userId === session.user.id))
    return { ok: false, error: t("Kayıt bulunamadı.") };
  if (tpl.payerId !== session.user.id && tpl.group.createdById !== session.user.id)
    return { ok: false, error: t("Bunu silme yetkiniz yok.") };

  await prisma.recurringExpense.delete({ where: { id } });
  revalidatePath(`/groups/${tpl.groupId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Premium / discount codes
// ---------------------------------------------------------------------------

/**
 * İndirim veya deneme kodu kullanır.
 * Kurallar: premium'u aktif olan hiçbir kod kullanamaz; aynı kod aynı kişi
 * tarafından bir kez kullanılabilir; kontenjan (maxUses) ve son kullanma
 * tarihi denetlenir. Deneme kodu anında premium başlatır.
 */
export async function applyDiscountCode(
  rawCode: string,
): Promise<ActionState & { percent?: number; trialDays?: number }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: t("Oturum bulunamadı.") };

  const code = rawCode.trim().toUpperCase();
  if (!/^[A-Z0-9]{3,20}$/.test(code))
    return { ok: false, error: t("Geçersiz kod biçimi.") };

  const dc = await prisma.discountCode.findUnique({
    where: { code },
    include: { _count: { select: { redemptions: true } } },
  });
  if (!dc || !dc.active)
    return { ok: false, error: t("Kod bulunamadı veya artık geçerli değil.") };
  if (dc.expiresAt && dc.expiresAt < new Date())
    return { ok: false, error: t("Bu kodun süresi dolmuş.") };
  if (dc.maxUses != null && dc._count.redemptions >= dc.maxUses)
    return { ok: false, error: t("Bu kodun kontenjanı dolmuş.") };

  // Premium'u aktifken hiçbir kod kullanılamaz (süreler üst üste binmez).
  if (await getEffectivePremium(session.user.id))
    return { ok: false, error: t("Premium üyeliğin aktifken kod kullanamazsın.") };

  const used = await prisma.codeRedemption.findUnique({
    where: { codeId_userId: { codeId: dc.id, userId: session.user.id } },
  });
  if (used) return { ok: false, error: t("Bu kodu daha önce kullandın.") };

  await prisma.codeRedemption.create({
    data: { codeId: dc.id, userId: session.user.id },
  });

  if (dc.kind === "trial" && dc.trialDays) {
    const until = new Date(Date.now() + dc.trialDays * 24 * 3600 * 1000);
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        premium: true,
        premiumPlan: null,
        premiumSource: "trial",
        premiumUntil: until,
      },
    });
    revalidatePath("/premium");
    return { ok: true, trialDays: dc.trialDays };
  }

  return { ok: true, percent: dc.percent };
}

// ---------------------------------------------------------------------------
// Admin actions — hepsi ADMIN_USERNAME (.env) doğrulamasından geçer.
// ---------------------------------------------------------------------------

export async function adminCreateCode(input: {
  code: string;
  kind?: "discount" | "trial";
  percent: number;
  trialDays?: number;
  maxUses?: number;
  influencer?: string;
  expiresAt?: string; // yyyy-mm-dd
}): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: t("Yetkin yok.") };

  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9]{3,20}$/.test(code))
    return { ok: false, error: t("Kod 3-20 harf/rakam olmalı (örn. KODUGIRINIZ).") };
  const kind = input.kind === "trial" ? "trial" : "discount";
  const percent = kind === "trial" ? 0 : Math.round(input.percent);
  if (kind === "discount" && (!Number.isFinite(percent) || percent < 1 || percent > 90))
    return { ok: false, error: t("İndirim %1 ile %90 arasında olmalı.") };
  const trialDays = kind === "trial" ? Math.round(input.trialDays ?? 0) : null;
  if (kind === "trial" && (!trialDays || trialDays < 1 || trialDays > 365))
    return { ok: false, error: t("Deneme süresi 1 ile 365 gün arasında olmalı.") };
  const maxUses =
    input.maxUses != null && Number.isFinite(input.maxUses) && input.maxUses > 0
      ? Math.round(input.maxUses)
      : null;

  const exists = await prisma.discountCode.findUnique({ where: { code } });
  if (exists) return { ok: false, error: t("Bu kod zaten var.") };

  await prisma.discountCode.create({
    data: {
      code,
      kind,
      percent,
      trialDays,
      maxUses,
      influencer: input.influencer?.trim() || null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    },
  });
  revalidatePath("/admin");
  return { ok: true };
}

export async function adminSetCodeActive(
  codeId: string,
  active: boolean,
): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: t("Yetkin yok.") };

  await prisma.discountCode.update({ where: { id: codeId }, data: { active } });
  revalidatePath("/admin");
  return { ok: true };
}

/** Bir üyenin premium durumunu elle aç/kapat (ödeme entegrasyonuna kadar). */
export async function adminSetPremium(
  userId: string,
  premium: boolean,
  plan?: "monthly" | "yearly",
): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: t("Yetkin yok.") };

  await prisma.user.update({
    where: { id: userId },
    data: {
      premium,
      premiumPlan: premium ? (plan ?? "monthly") : null,
      premiumSource: premium ? "admin" : null,
      premiumUntil: null,
    },
  });
  revalidatePath("/admin");
  return { ok: true };
}
