import { NextResponse, type NextRequest } from "next/server";
import { isPublicRoute, canAccessRoute } from "./config/route-permissions";

interface TokenClaims {
  sub?: string;
  role?: string;
  exp?: number;
  hospitalId?: string;
}

function parseJwtPayload(token: string): TokenClaims | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json) as TokenClaims;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public assets, internal next routes, and API endpoints
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/icons") ||
    pathname === "/favicon.ico" ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".webp")
  ) {
    return NextResponse.next();
  }

  // 2. Allow explicitly public routes (home, login, registration, etc.)
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // 3. Extract authentication cookies
  const accessCookie = request.cookies.get("ghms_access")?.value;
  const refreshCookie = request.cookies.get("ghms_refresh")?.value;

  // If no session tokens exist, immediately redirect to login
  if (!accessCookie && !refreshCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Inspect access claims if token is available
  if (accessCookie) {
    const claims = parseJwtPayload(accessCookie);
    const now = Date.now();

    // Check expiration if exp claim is present
    const isExpired = claims?.exp ? claims.exp * 1000 < now : false;

    if (isExpired && !refreshCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      loginUrl.searchParams.set("session_expired", "1");
      return NextResponse.redirect(loginUrl);
    }

    if (claims?.role) {
      const userRole = claims.role;

      // Strict Patient Isolation: Patients cannot access staff workspaces
      if (userRole.toUpperCase() === "PATIENT" && !pathname.startsWith("/patient-portal") && pathname !== "/profile") {
        return NextResponse.redirect(new URL("/patient-portal", request.url));
      }

      // Staff Isolation: Staff cannot access patient portal
      if (userRole.toUpperCase() !== "PATIENT" && pathname.startsWith("/patient-portal")) {
        return NextResponse.redirect(new URL("/access-denied", request.url));
      }

      // Department & Role authorization check
      if (!canAccessRoute(pathname, userRole)) {
        return NextResponse.redirect(new URL("/access-denied", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
