"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
const SITE_NAME = "OutlierFit";

const STATIC_TITLES: Record<string, string> = {
  "/": "About OutlierFit",
  "/about": "About OutlierFit",
  "/contact": "Contact OutlierFit",
  "/products": "Browse Products",
  "/cart": "Shopping Cart",
  "/checkout/success": "Order Confirmation",
  "/login": "Sign In",
  "/signup": "Create Account",
  "/forgot-password": "Forgot Password",
  "/reset-password": "Reset Password",
  "/verify-email": "Verify Email",
  "/profile": "Profile",
  "/profile/orders": "Orders",
  "/policies/returns": "Returns Policy",
  "/policies/shipping": "Shipping Policy",
};

function withSiteName(title: string) {
  return `${title} | ${SITE_NAME}`;
}

function staticTitleForPath(pathname: string) {
  return STATIC_TITLES[pathname] ?? SITE_NAME;
}

export default function PageTitle() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    if (pathname.match(/^\/products\/[^/]+$/)) return;

    document.title = withSiteName(staticTitleForPath(pathname));
  }, [pathname]);

  return null;
}
