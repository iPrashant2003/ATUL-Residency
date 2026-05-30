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
        pathname === "/manifest.json" ||
        pathname === "/sw.js" ||
        pathname === "/offline" ||
        pathname.startsWith("/.well-known") ||
        pathname.startsWith("/login") ||
        pathname.startsWith("/register") ||
        pathname.startsWith("/forgot-password") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/chat") ||
        pathname.startsWith("/api/public-stats") ||
        pathname === "/api/upload" ||
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
      // MINIMAL token — only store id and role, nothing else
      // This keeps the JWT cookie tiny to avoid Vercel's 8KB header limit
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        token.tenantId = (user as any).tenantId ?? null;
        // NEVER store image in token — fetch it fresh in session callback
        delete token.image;
        delete token.picture;
        delete token.name;
        delete token.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).tenantId = token.tenantId;
        // Do NOT set image from token — keep it null/empty
        session.user.image = null;
        session.user.name = session.user.name || "";
        session.user.email = session.user.email || "";
      }
      return session;
    },
  },
  providers: [], // Providers list is empty here; populated in auth.ts
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
} satisfies NextAuthConfig;
