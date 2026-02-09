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
  "/onboarding",
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith("/login");

  // Redirect logged-in users away from auth pages (respect callbackUrl)
  if (isAuthPage && isLoggedIn) {
    const callbackUrl = req.nextUrl.searchParams.get("callbackUrl");
    const target = callbackUrl?.startsWith("/") ? callbackUrl : "/dashboard";
    return Response.redirect(new URL(target, req.nextUrl));
  }

  // Protect app routes (require login, pass callbackUrl)
  if (isProtectedPath(req.nextUrl.pathname) && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl);
    const callback = req.nextUrl.pathname + req.nextUrl.search;
    if (callback !== "/dashboard") {
      loginUrl.searchParams.set("callbackUrl", callback);
    }
    return Response.redirect(loginUrl);
  }

  return;
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
