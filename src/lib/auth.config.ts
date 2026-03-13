import type { NextAuthConfig, Session } from "next-auth";
import Google from "next-auth/providers/google";

export interface SessionWithIat extends Session {
  iat?: number;
}

export const authConfig = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: process.env.NODE_ENV === "development",
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
      }
      // Expose JWT issued-at for session invalidation checks
      (session as SessionWithIat).iat = typeof token.iat === "number" ? token.iat : undefined;
      return session;
    },
  },
} satisfies NextAuthConfig;
