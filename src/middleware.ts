import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  });

  // Allow public routes
  const publicRoutes = ["/login", "/register", "/invite"];
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  // Allow API auth routes
  const isAuthApiRoute = request.nextUrl.pathname.startsWith("/api/auth");

  // Allow static files and PWA files
  const isStaticFile = 
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/favicon.ico") ||
    request.nextUrl.pathname.startsWith("/manifest.json") ||
    request.nextUrl.pathname.startsWith("/sw.js") ||
    request.nextUrl.pathname.startsWith("/workbox-") ||
    request.nextUrl.pathname.match(/\.(ico|png|jpg|jpeg|svg|json|js|woff|woff2)$/);

  if (isPublicRoute || isAuthApiRoute || isStaticFile) {
    return NextResponse.next();
  }

  // Require authentication for all other routes
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|login|register|invite|_next/static|_next/image|favicon.ico).*)",
  ],
};
