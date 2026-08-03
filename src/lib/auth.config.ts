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
        pathname.startsWith("/request-maintenance") ||
        pathname.startsWith("/maintenance-request") ||
        pathname.startsWith("/pay-rent") ||
        pathname.startsWith("/api/public") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/chat") ||
        pathname.startsWith("/api/public-stats") ||
        pathname.startsWith("/api/whatsapp/register-url") ||
        pathname === "/api/upload" ||
        new RegExp("^/api/rent/[^/]+/invoice").test(pathname);

      if (isPublicRoute) return true;

      if (!isLoggedIn) return false;

      // Admin-only routes
      if (pathname.startsWith("/admin") && role !== "ADMIN") {
        // Safe redirect: only redirect to tenant dashboard if they are actually a tenant.
        // Otherwise, send them to login to avoid infinite redirect loops.
        const redirectUrl = role === "TENANT" ? "/tenant/dashboard" : "/login";
        return Response.redirect(new URL(redirectUrl, nextUrl));
      }

      // Tenant-only routes
      if (pathname.startsWith("/tenant") && role !== "TENANT") {
        // Safe redirect: only redirect to admin dashboard if they are actually an admin.
        // Otherwise, send them to login to avoid infinite redirect loops.
        const redirectUrl = role === "ADMIN" ? "/admin/dashboard" : "/login";
        return Response.redirect(new URL(redirectUrl, nextUrl));
      }

      return true;
    },
    async jwt({ token, user }) {
      // MINIMAL token — only store id, role, tenantId
      // This keeps the JWT cookie tiny to avoid Vercel's 8KB header limit
      // CRITICAL: Strip on EVERY request, not just initial login
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        token.tenantId = (user as any).tenantId ?? null;
      }
      // ALWAYS return only essential fields — prevents cookie bloat over time
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
