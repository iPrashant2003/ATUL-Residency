import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = (auth?.user as any)?.role;
      const { pathname } = nextUrl;

      // Public routes
      const isPublicRoute =
        pathname === "/" ||
        pathname.startsWith("/login") ||
        pathname.startsWith("/register") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/chat") ||
        pathname.startsWith("/api/public-stats") ||
        new RegExp("^/api/rent/[^/]+/invoice").test(pathname);

      if (isPublicRoute) return true;

      if (!isLoggedIn) return false;

      // Admin-only routes
      if (pathname.startsWith("/admin") && role !== "ADMIN") {
        return Response.redirect(new URL("/tenant/dashboard", nextUrl));
      }

      // Tenant-only routes
      if (pathname.startsWith("/tenant") && role !== "TENANT") {
        return Response.redirect(new URL("/admin/dashboard", nextUrl));
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        token.tenantId = (user as any).tenantId;
        token.image = (user as any).image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).tenantId = token.tenantId;
        session.user.image = token.image as string || null;
      }
      return session;
    },
  },
  providers: [], // Providers list is empty here; populated in auth.ts
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "atul-residency-secret-key-2024",
  trustHost: true,
} satisfies NextAuthConfig;
