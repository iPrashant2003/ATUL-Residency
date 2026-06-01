import { NextResponse } from "next/server";

// GET /api/auth/clear-cookies
// Emergency cookie cleanup endpoint — clears all auth cookies and redirects to login
export async function GET() {
  const response = NextResponse.redirect(new URL("/login", "http://localhost:3000"));
  
  // Delete all possible auth cookie variants
  const cookieNames = [
    "authjs.session-token",
    "authjs.callback-url",
    "authjs.csrf-token",
    "__Secure-authjs.session-token",
    "__Secure-authjs.callback-url",
    "__Secure-authjs.csrf-token",
    "next-auth.session-token",
    "next-auth.callback-url",
    "next-auth.csrf-token",
    "__Secure-next-auth.session-token",
    "__Secure-next-auth.callback-url",
    "__Secure-next-auth.csrf-token",
  ];

  for (const name of cookieNames) {
    response.cookies.delete(name);
    // Also delete chunked variants
    for (let i = 0; i < 10; i++) {
      response.cookies.delete(`${name}.${i}`);
    }
  }

  return response;
}
