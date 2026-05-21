"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { SITE_NAME } from "@/lib/proctor";

const STATIC_TITLES: Record<string, string> = {
  "/": `About ${SITE_NAME}`,
  "/about": `About ${SITE_NAME}`,
  "/contact": `Contact ${SITE_NAME}`,
  "/proctors": "Find Proctors",
  "/cart": "Booking Review",
  "/checkout/success": "Order Confirmation",
  "/login": "Sign In",
  "/signup": "Create Account",
  "/forgot-password": "Forgot Password",
  "/reset-password": "Reset Password",
  "/verify-email": "Verify Email",
  "/profile": "Profile",
  "/profile/orders": "Orders",
  "/policies/returns": "Cancellation Policy",
  "/policies/shipping": "Service Areas",
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

    if (pathname.match(/^\/proctors\/[^/]+$/)) return;

    document.title = withSiteName(staticTitleForPath(pathname));
  }, [pathname]);

  return null;
}
