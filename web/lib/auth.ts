import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "./prisma";
import { normalizeUsername } from "./username";

/**
 * Google/Apple ile ilk girişte hesap oluşturur (veya aynı e-postalı mevcut
 * hesaba OAuth kimliğini bağlar). Kullanıcı adı e-postadan türetilir,
 * çakışırsa sayı eklenir. Şifre girişi olmadığından passwordHash kullanılamaz
 * rastgele bir değerle doldurulur — sütunu opsiyonel yapmak SQLite'ta riskli
 * bir tablo yeniden oluşturma migration'ı gerektirdiğinden bu daha güvenli.
 */
async function findOrCreateOAuthUser(input: {
  provider: "google" | "apple";
  providerId: string;
  email: string | null | undefined;
  name: string | null | undefined;
}): Promise<{ id: string; username: string } | null> {
  const idField = input.provider === "google" ? "googleId" : "appleId";

  const byProviderId = await prisma.user.findFirst({
    where: { [idField]: input.providerId },
    select: { id: true, username: true },
  });
  if (byProviderId) return byProviderId;

  if (input.email) {
    const byEmail = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, username: true },
    });
    if (byEmail) {
      await prisma.user.update({
        where: { id: byEmail.id },
        data: { [idField]: input.providerId },
      });
      return byEmail;
    }
  }

  if (!input.email) return null;

  const base = normalizeUsername(input.email.split("@")[0]).replace(/[^a-z0-9]/g, "") || "kullanici";
  let username = base;
  for (let i = 0; i < 50; i++) {
    const usernameLower = normalizeUsername(username);
    const taken = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "User"
      WHERE "usernameLower" = ${usernameLower} OR LOWER(username) = LOWER(${username})
      LIMIT 1`;
    if (taken.length === 0) break;
    username = `${base}${Math.floor(Math.random() * 10000)}`;
  }

  const created = await prisma.user.create({
    data: {
      username,
      usernameLower: normalizeUsername(username),
      email: input.email,
      emailVerified: new Date(), // Google/Apple e-postayı zaten doğrulamış
      displayName: input.name ?? null,
      passwordHash: await bcrypt.hash(randomBytes(32).toString("hex"), 12),
      [idField]: input.providerId,
    },
    select: { id: true, username: true },
  });
  return created;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    ...(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET
      ? [
          AppleProvider({
            clientId: process.env.APPLE_CLIENT_ID,
            clientSecret: process.env.APPLE_CLIENT_SECRET,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Kullanıcı adı", type: "text" },
        password: { label: "Parola", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        // Demo hesabı kapalı: tanıtım amaçlıydı, artık girişe izin verilmez.
        if (credentials.username.trim().toLowerCase() === "demo") return null;

        // Kullanıcı adı VEYA e-posta ile giriş; büyük/küçük harfe duyarsız
        // (mobil klavyeler ilk harfi kendiliğinden büyütebiliyor).
        // usernameLower Unicode farkındalıklıdır; LOWER() yalnızca ASCII
        // çevirdiği için Türkçe karakterli adlar orada eşleşmez.
        const q = credentials.username.trim();
        const lower = normalizeUsername(q);
        const rows = await prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM "User"
          WHERE "usernameLower" = ${lower}
             OR LOWER(username) = LOWER(${q})
             OR (email IS NOT NULL AND LOWER(email) = LOWER(${q}))
          LIMIT 1`;
        if (rows.length === 0) return null;
        const user = await prisma.user.findUnique({ where: { id: rows[0].id } });
        if (!user || user.username.toLowerCase() === "demo") return null;

        // Eski kayıtlarda usernameLower yanlış olabilir (migration ASCII
        // LOWER kullandı); ilk girişte sessizce düzelt.
        const correct = normalizeUsername(user.username);
        if (user.usernameLower !== correct) {
          await prisma.user
            .update({ where: { id: user.id }, data: { usernameLower: correct } })
            .catch(() => {});
        }

        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.displayName ?? user.username,
          username: user.username,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google" && account?.provider !== "apple") return true;
      const dbUser = await findOrCreateOAuthUser({
        provider: account.provider,
        providerId: account.providerAccountId,
        email: user.email ?? (profile as { email?: string } | undefined)?.email,
        name: user.name,
      });
      if (!dbUser) return false; // e-posta paylaşılmadıysa hesap eşleştirilemez
      // signIn sonrası jwt callback'ine aktarılacak alanları burada dolduruyoruz.
      user.id = dbUser.id;
      (user as { username?: string }).username = dbUser.username;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as { username?: string }).username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

/** Convenience wrapper for server components / actions. */
export function auth() {
  return getServerSession(authOptions);
}
