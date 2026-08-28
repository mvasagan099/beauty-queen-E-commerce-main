import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const customerProtectedPaths = ["/account", "/checkout"];
const sellerProtectedPaths = ["/seller"];
const adminProtectedPaths = ["/admin"];

const sellerAuthPaths = ["/seller/login", "/seller/signup"];
const authPaths = ["/login", "/verify"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("access_token");

  const isCustomerProtected = customerProtectedPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  const isSellerProtected =
    !sellerAuthPaths.some((p) => pathname === p) &&
    sellerProtectedPaths.some(
      (path) => pathname === path || pathname.startsWith(path + "/")
    );

  const isAdminProtected = adminProtectedPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  const isSellerAuthPage = sellerAuthPaths.some((p) => pathname === p);
  const isAuthPage = authPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  // Protected areas require an active session cookie.
  // The backend still enforces role-based authorization on every API;
  // this is only a frontend routing guard.
  if (
    (isCustomerProtected || isSellerProtected || isAdminProtected) &&
    !accessToken
  ) {
    if (isSellerProtected) {
      return NextResponse.redirect(new URL("/seller/login", request.url));
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isSellerAuthPage && accessToken) {
    return NextResponse.redirect(new URL("/seller/dashboard", request.url));
  }

  if (isAuthPage && accessToken) {
    return NextResponse.redirect(new URL("/account", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/account/:path*",
    "/checkout/:path*",
    "/seller/:path*",
    "/admin/:path*",
    "/login",
    "/verify",
  ],
};
