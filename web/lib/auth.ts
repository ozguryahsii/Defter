import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
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
        const q = credentials.username.trim();
        const rows = await prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM "User"
          WHERE LOWER(username) = LOWER(${q})
             OR (email IS NOT NULL AND LOWER(email) = LOWER(${q}))
          LIMIT 1`;
        if (rows.length === 0) return null;
        const user = await prisma.user.findUnique({ where: { id: rows[0].id } });
        if (!user || user.username.toLowerCase() === "demo") return null;

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
