import NextAuth from "next-auth";
import { authConfig } from "./lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|offline|\\.well-known/|.*\\.png$|.*\\.ico$|.*\\.svg$).*)"],
};
