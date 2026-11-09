import { authConfig } from "@/lib/auth.config";
import { isSafeCallbackPath } from "@/lib/safe-callback-path";
import { APP_ROUTES } from "@habita/contracts";
import NextAuth from "next-auth";

/**
 * Public routes that do NOT require authentication.
 * Everything else is protected by default (deny-by-default).
 */
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/join",
  "/privacidad",
  // OAuth for the Ahorrá MCP: discovery metadata, and a consent page that runs its own login redirect
  "/.well-known",
  "/oauth",
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
    const target = isSafeCallbackPath(callbackUrl) ? callbackUrl : APP_ROUTES.casa;
    return Response.redirect(new URL(target, req.nextUrl));
  }

  // Public routes — allow without auth
  if (isPublicPath(pathname)) {
    return;
  }

  // Everything else requires authentication — redirect to landing
  if (!isLoggedIn) {
    return Response.redirect(new URL("/", req.nextUrl));
  }

  return;
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|js|css|woff2?|ttf)$).*)"],
};
