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
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        token.tenantId = (user as any).tenantId;
        token.image = (user as any).image;
      } else if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            include: { tenant: true },
          });
          if (dbUser) {
            token.role = dbUser.role;
            token.tenantId = dbUser.tenant?.id || null;
            token.image = dbUser.tenant?.photoUrl || null;
            token.name = dbUser.name;
            token.email = dbUser.email;
          }
        } catch (error) {
          console.error("Error refreshing token in jwt callback:", error);
        }
      }
      return token;
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        identifier: { label: "Email or Phone", type: "text" },
        password: { label: "Password", type: "password" },
        // OTP login: pass otpVerified=true and userId
        otpVerified: { label: "OTP Verified", type: "text" },
        userId: { label: "User ID", type: "text" },
      },
      async authorize(credentials) {
        // --- OTP Login path ---
        if (credentials?.otpVerified === "true" && credentials?.userId) {
          const user = await prisma.user.findUnique({
            where: { id: credentials.userId as string },
            include: { tenant: true },
          });
          if (!user) return null;
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenantId: user.tenant?.id || null,
            image: user.tenant?.photoUrl || null,
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
            include: { tenant: true },
          });
        } else {
          user = await prisma.user.findFirst({
            where: { phone: { endsWith: cleanPhone } },
            include: { tenant: true },
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
          image: user.tenant?.photoUrl || null,
        };
      },
    }),
  ],
});
