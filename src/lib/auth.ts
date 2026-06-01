import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      // MINIMAL token — only id, role, tenantId
      // ALWAYS strip to essentials on EVERY request to prevent cookie bloat
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        token.tenantId = (user as any).tenantId ?? null;
      }
      return {
        role: token.role,
        id: token.id,
        tenantId: token.tenantId,
        sub: token.sub,
        iat: token.iat,
        exp: token.exp,
        jti: token.jti,
      };
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).tenantId = token.tenantId;

        try {
          // Fetch fresh user data from database (only name, email, and photoUrl)
          // This keeps cookie size extremely tiny while keeping the UI updated
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              name: true,
              email: true,
              tenant: {
                select: {
                  photoUrl: true,
                },
              },
            },
          });

          if (dbUser) {
            session.user.name = dbUser.name;
            session.user.email = dbUser.email;
            
            const photo = dbUser.tenant?.photoUrl;
            // Never allow base64 string, only web URLs
            session.user.image = (photo && photo.startsWith("data:")) ? null : (photo || null);
          }
        } catch (error) {
          console.error("Error fetching fresh user data in session callback:", error);
        }
      }
      return session;
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        identifier: { label: "Email or Phone", type: "text" },
        password: { label: "Password", type: "password" },
        otpVerified: { label: "OTP Verified", type: "text" },
        userId: { label: "User ID", type: "text" },
      },
      async authorize(credentials) {
        // --- OTP Login path ---
        if (credentials?.otpVerified === "true" && credentials?.userId) {
          const user = await prisma.user.findUnique({
            where: { id: credentials.userId as string },
            select: { id: true, email: true, name: true, role: true, tenant: { select: { id: true } } },
          });
          if (!user) return null;
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenantId: user.tenant?.id || null,
          };
        }

        // --- Email/Phone + Password Login path ---
        if (!credentials?.identifier || !credentials?.password) return null;

        const identifier = credentials.identifier as string;
        const isEmail = identifier.includes("@");
        const cleanPhone = isEmail ? "" : identifier.replace(/\D/g, "").slice(-10);

        let user = null;
        if (isEmail) {
          user = await prisma.user.findUnique({
            where: { email: identifier.toLowerCase().trim() },
            select: { id: true, email: true, name: true, role: true, password: true, tenant: { select: { id: true } } },
          });
        } else {
          user = await prisma.user.findFirst({
            where: { phone: { endsWith: cleanPhone } },
            select: { id: true, email: true, name: true, role: true, password: true, tenant: { select: { id: true } } },
          });
        }

        if (!user) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenant?.id || null,
        };
      },
    }),
  ],
});
