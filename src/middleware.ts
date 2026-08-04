import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Calculate total cookie header size to prevent Vercel 8KB header errors
  const cookieHeader = req.headers.get("cookie") || "";
  const cookieSize = new TextEncoder().encode(cookieHeader).length;

  if (cookieSize > 4000) {
    console.warn(`⚠️ Cookie header too large (${cookieSize} bytes). Sending cookie-clearing page.`);

    const html = `<!DOCTYPE html>
<html>
<head><title>Clearing session...</title></head>
<body style="background:#0a0c0c;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;margin:0">
<div style="text-align:center">
<p style="font-size:18px;font-weight:700">🔄 Clearing session...</p>
<p style="font-size:13px;color:#94a3b8;margin-top:8px">Please wait, redirecting to login...</p>
</div>
<script>
document.cookie.split(';').forEach(function(c) {
  var name = c.split('=')[0].trim();
  if (!name) return;
  if (name.indexOf('__Host-') === 0) {
    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;secure';
  } else {
    var paths = ['/', '/admin', '/tenant', '/api', '/login', ''];
    paths.forEach(function(p) {
      document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=' + (p || '/');
      document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=' + (p || '/') + ';secure';
      document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=' + (p || '/') + ';domain=' + location.hostname;
      document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=' + (p || '/') + ';domain=.' + location.hostname;
    });
  }
});
setTimeout(function() { window.location.href = '/login'; }, 500);
</script>
</body>
</html>`;

    const response = new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });

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

  // Check auth session cookie for protected dashboard routes (/admin, /tenant)
  if (pathname.startsWith("/admin") || pathname.startsWith("/tenant")) {
    const sessionToken = req.cookies.get("authjs.session-token")?.value ||
      req.cookies.get("__Secure-authjs.session-token")?.value ||
      req.cookies.get("next-auth.session-token")?.value ||
      req.cookies.get("__Secure-next-auth.session-token")?.value;

    if (!sessionToken) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/tenant/:path*"],
};
