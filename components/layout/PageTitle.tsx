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

/**
 * Runs the with site name logic for this module.
 *
 * @param title - Input used by with site name.
 *
 * @returns The result used by the surrounding flow.
 */
function withSiteName(title: string) {
  return `${title} | ${SITE_NAME}`;
}

/**
 * Runs the static title for path logic for this module.
 *
 * @param pathname - Input used by static title for path.
 *
 * @returns The result used by the surrounding flow.
 */
function staticTitleForPath(pathname: string) {
  return STATIC_TITLES[pathname] ?? SITE_NAME;
}

/**
 * Renders the page title component.
 *
 * @returns The rendered UI for this component.
 */
export default function PageTitle() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    if (pathname.match(/^\/proctors\/[^/]+$/)) return;

    document.title = withSiteName(staticTitleForPath(pathname));
  }, [pathname]);

  return null;
}
