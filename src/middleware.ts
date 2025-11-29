import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Allow public routes
  const publicRoutes = ["/login", "/register", "/invite"];
  const isPublicRoute = publicRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Allow API auth routes (including session endpoint)
  const isAuthApiRoute = pathname.startsWith("/api/auth");

  // Allow static files and PWA files
  const isStaticFile = 
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/manifest.json") ||
    pathname.startsWith("/sw.js") ||
    pathname.startsWith("/workbox-") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|json|js|woff|woff2)$/);

  if (isPublicRoute || isAuthApiRoute || isStaticFile) {
    return NextResponse.next();
  }

  // Check for authentication token
  // Try to get token - getToken will automatically detect the correct cookie name
  // based on the environment (dev vs prod)
  let token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  // If token not found, try with explicit cookie names as fallback
  if (!token) {
    const isProduction = process.env.NODE_ENV === "production";
    const cookieName = isProduction 
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";
    
    token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName,
    });
  }

  // Require authentication for all other routes
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    // Don't add callbackUrl to avoid redirect loops
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|login|register|invite|_next/static|_next/image|favicon.ico).*)",
  ],
};

