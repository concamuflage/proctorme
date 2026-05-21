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
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    const callbackUrl = searchParams.get("callbackUrl") ?? "/proctors";
    router.replace(callbackUrl);
  }, [router, searchParams, status]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto flex max-w-6xl justify-center px-4 py-10 sm:px-6 sm:py-16">
        <div className="w-full max-w-md">
          {/* Primary login form content. */}
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

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
