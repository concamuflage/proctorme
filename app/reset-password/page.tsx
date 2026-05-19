"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

function ResetPasswordPageContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const token = searchParams.get("token") ?? "";
  const isValidRequest = email.trim().length > 0 && token.trim().length > 0;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto flex max-w-6xl justify-center px-4 py-10 sm:px-6 sm:py-16">
        <div className="w-full max-w-md">
          {isValidRequest ? (
            <ResetPasswordForm email={email} token={token} />
          ) : (
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
              <h1 className="text-2xl font-semibold">Invalid reset link</h1>
              <p className="mt-2 text-sm text-zinc-600">
                This password reset link is incomplete or invalid. Please request a new one.
              </p>
              <Link
                href="/forgot-password"
                className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800"
              >
                Request a new link
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}
