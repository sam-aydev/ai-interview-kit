import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const token = request.cookies.get("trao_token")?.value;
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/app") && !token) {
    const loginUrl = new URL("/auth", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If user is already logged in, they shouldn't see the login page
  if (pathname.startsWith("/auth") && token) {
    const dashboardUrl = new URL("/app", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Allow the request to proceed normally if it passes the checks
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/auth/:path*"],
};
