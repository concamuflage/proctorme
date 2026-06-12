"use client";

import React, { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import LoginForm from "@/components/auth/LoginForm";

/**
 * Standalone login page (non-modal).
 */
function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Read the current NextAuth session status (loading, authenticated, unauthenticated).
  const { status } = useSession();

  // If the user is already authenticated, redirect them to the post-login route.
  // The original destination is preserved via callbackUrl.
  useEffect(() => {
    if (status !== "authenticated") return;
    // Use the callbackUrl query parameter when present; otherwise fall back
    // to the default proctor listing page.
    const callbackUrl = searchParams.get("callbackUrl") ?? "/proctors";
    // Replace the current history entry so the login page is not left in the
    // browser history after a successful login.
    router.replace(`/account/post-login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }, [router, searchParams, status]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto flex max-w-6xl justify-center px-4 py-10 sm:px-6 sm:py-16">
        <div className="w-full max-w-md">
          {/* Primary login form content. */}
          {/* Reusable login form component containing the authentication UI. */}
          <LoginForm />
          {/* Keep login and signup as separate routes as well. */}
          <div className="mt-4 text-center text-xs text-zinc-600">
            New here?{" "}
            <Link className="text-zinc-900 underline" href="/signup">
              Create an account
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Renders the /login page.
 *
 * @returns The page UI.
 */
export default function LoginPage() {
  // Required because useSearchParams() is used by LoginPageContent.
  return (

    // Render LoginPageContent.
    // If it has to wait for something, show fallback instead.
    // In Next.js App Router, useSearchParams() needs to find the query parameters in the URL, so it can only be rendered in the browser.
    //  Components inside Suspense will be rendered by the browser, not at the build time.

    // Question:why do we need suspense here?
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
