"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import SignupForm from "@/components/auth/SignupForm";

/**
 * Standalone signup page (non-modal).
 */
export default function SignupPage() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    router.replace("/products");
  }, [router, status]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto flex max-w-6xl justify-center px-4 py-10 sm:px-6 sm:py-16">
        <div className="w-full max-w-md">
          {/* Primary signup form content. */}
          <SignupForm />
          {/* Keep login and signup as separate routes as well. */}
          <div className="mt-4 text-center text-xs text-zinc-600">
            Already have an account?{" "}
            <Link className="text-zinc-900 underline" href="/login">
              Sign in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
