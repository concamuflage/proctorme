"use client";

import Link from "next/link";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

/**
 * Renders the /forgot-password page.
 *
 * @returns The page UI.
 */
export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto flex max-w-6xl justify-center px-4 py-10 sm:px-6 sm:py-16">
        <div className="w-full max-w-md">
          <ForgotPasswordForm />
          <div className="mt-4 text-center text-xs text-zinc-600">
            Remembered your password?{" "}
            <Link className="text-zinc-900 underline" href="/login">
              Sign in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
