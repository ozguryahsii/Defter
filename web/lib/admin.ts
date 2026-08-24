import { auth } from "./auth";

/**
 * Yöneticiler ortam değişkeniyle belirlenir (ADMIN_USERNAME). Repo herkese
 * açık olduğu için admin kimliği kodda TUTULMAZ; her sunucunun ortamında
 * tanımlanır. Birden çok admin için virgülle ayrılmış liste verilebilir
 * (ör. ADMIN_USERNAME="kullanici1,kullanici2"). Tek kullanıcı adı da
 * çalışır (geriye dönük uyumlu). Değişken boşsa hiç kimse admin değildir.
 */
export function isAdminUsername(username?: string | null): boolean {
  if (!username) return false;
  const admins = (process.env.ADMIN_USERNAME ?? "")
    .split(",")
    .map((u) => u.trim().toLowerCase())
    .filter(Boolean);
  if (admins.length === 0) return false;
  return admins.includes(username.trim().toLowerCase());
}

/** Oturumdaki kullanıcı admin ise session döner, değilse null. */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (!isAdminUsername(session.user.username)) return null;
  return session;
}
