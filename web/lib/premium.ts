import { prisma } from "./prisma";

/**
 * Kullanıcının premium'u ŞU AN geçerli mi? premiumUntil dolmuşsa tembel
 * (lazy) olarak free'ye düşürür ve false döner.
 */
export async function getEffectivePremium(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { premium: true, premiumUntil: true },
  });
  if (!u?.premium) return false;
  if (u.premiumUntil && u.premiumUntil <= new Date()) {
    await prisma.user.update({
      where: { id: userId },
      data: { premium: false, premiumPlan: null, premiumSource: null, premiumUntil: null },
    });
    return false;
  }
  return true;
}
