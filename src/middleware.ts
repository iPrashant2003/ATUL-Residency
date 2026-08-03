import NextAuth from "next-auth";
import { authConfig } from "./lib/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const authMiddleware = NextAuth(authConfig).auth;

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Calculate total cookie header size
  const cookieHeader = request.headers.get("cookie") || "";
  const cookieSize = new TextEncoder().encode(cookieHeader).length;

  // Vercel's limit is ~8KB for headers. If cookies are too large (>4KB to be safe),
  // return a self-clearing HTML page that nukes all cookies via JavaScript
  if (cookieSize > 4000) {
    console.warn(`⚠️ Cookie header too large (${cookieSize} bytes). Sending cookie-clearing page.`);

    // Return an HTML page that clears ALL cookies client-side, then redirects to /login
    const html = `<!DOCTYPE html>
<html>
<head><title>Clearing session...</title></head>
<body style="background:#0a0c0c;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;margin:0">
<div style="text-align:center">
<p style="font-size:18px;font-weight:700">🔄 Clearing session...</p>
<p style="font-size:13px;color:#94a3b8;margin-top:8px">Please wait, redirecting to login...</p>
</div>
<script>
// Delete ALL cookies for this domain (every path variant)
document.cookie.split(';').forEach(function(c) {
  var name = c.split('=')[0].trim();
  if (!name) return;
  if (name.indexOf('__Host-') === 0) {
    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;secure';
  } else {
    // Clear for all possible path combinations
    var paths = ['/', '/admin', '/tenant', '/api', '/login', ''];
    paths.forEach(function(p) {
      document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=' + (p || '/');
      document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=' + (p || '/') + ';secure';
      document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=' + (p || '/') + ';domain=' + location.hostname;
      document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=' + (p || '/') + ';domain=.' + location.hostname;
    });
  }
});
// Redirect to login after cookies are cleared
setTimeout(function() { window.location.href = '/login'; }, 500);
</script>
</body>
</html>`;

    // Also set server-side Set-Cookie headers to delete known auth cookies
    const response = new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });

    // Server-side deletion of all auth cookie variants (including secure and Host prefixes)
    const cookieNames = [
      "authjs.session-token", "authjs.callback-url", "authjs.csrf-token",
      "__Secure-authjs.session-token", "__Secure-authjs.callback-url", "__Secure-authjs.csrf-token",
      "__Host-authjs.session-token", "__Host-authjs.callback-url", "__Host-authjs.csrf-token",
      "next-auth.session-token", "next-auth.callback-url", "next-auth.csrf-token",
      "__Secure-next-auth.session-token", "__Secure-next-auth.callback-url", "__Secure-next-auth.csrf-token",
      "__Host-next-auth.session-token", "__Host-next-auth.callback-url", "__Host-next-auth.csrf-token",
    ];
    for (const name of cookieNames) {
      response.cookies.delete(name);
      for (let i = 0; i < 10; i++) {
        response.cookies.delete(`${name}.${i}`);
      }
    }

    return response;
  }

  // @ts-ignore
  return authMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|offline|\\.well-known/|api/upload|api/whatsapp|.*\\.png$|.*\\.ico$|.*\\.svg$).*)"],
};
