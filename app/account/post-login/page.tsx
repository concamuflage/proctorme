"use client";

// Validates and normalizes the callback URL.
// Only same-origin redirects are allowed to prevent open redirect vulnerabilities.
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

/**
 * Runs the safe callback url logic for this module.
 *
 * @param value - Input used by safe callback url.
 *
 * @returns The result used by the surrounding flow.
 */
function safeCallbackUrl(value: string | null) {
  // Default destination when no callback URL is provided.
  if (!value) return "/proctors";
  // Allow relative application routes.
  if (value.startsWith("/") && !value.startsWith("//")) return value;

  try {
    // Keep redirects on this origin so callbackUrl cannot be used as an open redirect.
    const parsed = new URL(value, window.location.origin);
    if (parsed.origin !== window.location.origin) return "/proctors";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/proctors";
  }
}

// Handles post-authentication routing based on the user's roles and onboarding status.
/**
 * Renders the post login content component.
 *
 * @returns The rendered UI for this component.
 */
function PostLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const [message, setMessage] = useState("Checking your account...");

  // Wait for the session to resolve, then determine where the user should be redirected.
  useEffect(() => {
    // Sanitize the callback URL received from the login flow.
    const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));

    // Do nothing until NextAuth finishes loading the session state.
    if (status === "loading") return;
    // Unauthenticated users are sent back to the login page.
    if (status !== "authenticated") {
      //Redirect to login, but include the original page URL so we can return there after login.
      router.replace(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }

    // Tracks whether the component has unmounted to avoid state updates afterward.
    let cancelled = false;

    // Fetch role information and decide the correct destination.
    /**
     * Runs the route after login logic for this module.
     *
     * @returns The result used by the surrounding flow.
     */
    async function routeAfterLogin() {
      setMessage("Checking your account...");
      // Always fetch fresh role data so redirects reflect the latest account state.
      const response = await fetch("/api/account/roles", { cache: "no-store" });
      const payload = await response.json().catch(() => null);

      // Avoid updating state or navigating after the component unmounts.
      if (cancelled) return;

      // New users must choose a role, unless they already started proctor verification.
      if (response.ok && payload?.hasRoles === false) {
        router.replace(payload?.hasProctorApplication === true ? "/account/proctor-verification" : "/account/role-choice");
        return;
      }

      // Admins should land in the admin area regardless of the original callback.
      if (response.ok && Array.isArray(payload?.roles) && payload.roles.some((role: { name?: unknown }) => role.name === "admin")) {
        router.replace("/admin");
        return;
      }

      // Standard users continue to their originally requested page.
      router.replace(callbackUrl);
    }

    // If role lookup fails, fall back to the callback URL instead of blocking access.
    routeAfterLogin().catch(() => {
      if (!cancelled) {
        setMessage("Unable to check roles. Continuing...");
        router.replace(callbackUrl);
      }
    });

    // Cleanup flag used to prevent updates after unmount.
    return () => {
      cancelled = true;
    };
  }, [router, searchParams, status]);

  // Display a lightweight status message while redirect logic is running.
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto flex max-w-6xl justify-center px-4 py-10 sm:px-6 sm:py-16">
        <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm sm:p-8">
          {message}
        </div>
      </main>
    </div>
  );
}

/**
 * Renders the /account/post-login page.
 *
 * @returns The page UI.
 */
export default function PostLoginPage() {
  return (
    // useSearchParams requires a Suspense boundary in Next.js app routes.
    <Suspense fallback={null}>
      <PostLoginContent />
    </Suspense>
  );
}
