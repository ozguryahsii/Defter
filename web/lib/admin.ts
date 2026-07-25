import { auth } from "./auth";

/**
 * Yönetici, ortam değişkeniyle belirlenir (ADMIN_USERNAME). Repo herkese
 * açık olduğu için admin kimliği kodda TUTULMAZ; her sunucunun .env
 * dosyasında tanımlanır. Değişken boşsa hiç kimse admin değildir.
 */
export function isAdminUsername(username?: string | null): boolean {
  const admin = process.env.ADMIN_USERNAME?.trim().toLowerCase();
  if (!admin || !username) return false;
  return username.trim().toLowerCase() === admin;
}

/** Oturumdaki kullanıcı admin ise session döner, değilse null. */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (!isAdminUsername(session.user.username)) return null;
  return session;
}
