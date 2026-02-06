import { authConfig } from "@/lib/auth.config";
import NextAuth from "next-auth";

const PROTECTED_PATHS = [
  "/dashboard",
  "/app",
  "/tasks",
  "/rotations",
  "/kids",
  "/my-tasks",
  "/rewards",
  "/parental",
  "/preferences",
  "/profile",
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith("/login");

  // Redirect logged-in users away from auth pages
  if (isAuthPage && isLoggedIn) {
    return Response.redirect(new URL("/dashboard", req.nextUrl));
  }

  // Protect app routes (require login)
  if (isProtectedPath(req.nextUrl.pathname) && !isLoggedIn) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }

  return;
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
