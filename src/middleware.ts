import { authConfig } from "@/lib/auth.config";
import NextAuth from "next-auth";

/**
 * Public routes that do NOT require authentication.
 * Everything else is protected by default (deny-by-default).
 */
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/join",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // Redirect logged-in users away from login page (respect callbackUrl)
  if (pathname.startsWith("/login") && isLoggedIn) {
    const callbackUrl = req.nextUrl.searchParams.get("callbackUrl");
    const target = callbackUrl?.startsWith("/") && !callbackUrl.includes("://")
      ? callbackUrl
      : "/dashboard";
    return Response.redirect(new URL(target, req.nextUrl));
  }

  // Public routes — allow without auth
  if (isPublicPath(pathname)) {
    return;
  }

  // Everything else requires authentication
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl);
    const callback = pathname + req.nextUrl.search;
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
