import NextAuth from "next-auth";
import { authConfig } from "./lib/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const authMiddleware = NextAuth(authConfig).auth;

// Wrap the auth middleware with a cookie size guard
export default async function middleware(request: NextRequest) {
  // Calculate total cookie header size
  const cookieHeader = request.headers.get("cookie") || "";
  const cookieSize = new TextEncoder().encode(cookieHeader).length;

  // Vercel's limit is ~8KB for headers. If cookies are too large (>6KB to be safe),
  // clear the session cookies and redirect to login
  if (cookieSize > 6000) {
    console.warn(`⚠️ Cookie header too large (${cookieSize} bytes). Clearing session cookies.`);
    
    const response = NextResponse.redirect(new URL("/login", request.url));
    
    // Delete all auth-related cookies
    response.cookies.delete("authjs.session-token");
    response.cookies.delete("authjs.callback-url");
    response.cookies.delete("authjs.csrf-token");
    response.cookies.delete("__Secure-authjs.session-token");
    response.cookies.delete("__Secure-authjs.callback-url");
    response.cookies.delete("__Secure-authjs.csrf-token");
    response.cookies.delete("next-auth.session-token");
    response.cookies.delete("next-auth.callback-url");
    response.cookies.delete("next-auth.csrf-token");
    response.cookies.delete("__Secure-next-auth.session-token");
    response.cookies.delete("__Secure-next-auth.callback-url");
    response.cookies.delete("__Secure-next-auth.csrf-token");
    
    // Also clear any chunked session cookies (authjs splits large JWTs into chunks)
    for (let i = 0; i < 10; i++) {
      response.cookies.delete(`authjs.session-token.${i}`);
      response.cookies.delete(`__Secure-authjs.session-token.${i}`);
      response.cookies.delete(`next-auth.session-token.${i}`);
      response.cookies.delete(`__Secure-next-auth.session-token.${i}`);
    }
    
    return response;
  }

  // @ts-ignore - auth middleware type mismatch is fine
  return authMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|offline|\\.well-known/|api/upload|.*\\.png$|.*\\.ico$|.*\\.svg$).*)"],
};
