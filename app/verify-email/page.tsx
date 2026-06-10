"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CLIENT_API_BASE_PATH } from "@/lib/api-base";

type VerificationState = "loading" | "success" | "error";

/**
 * Renders the verify email page content component.
 *
 * @returns The rendered UI for this component.
 */
function VerifyEmailPageContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const token = searchParams.get("token");
  const initialErrorMessage = !email || !token
    ? "This verification link is incomplete."
    : null;
  const [state, setState] = useState<VerificationState>(initialErrorMessage ? "error" : "loading");
  const [message, setMessage] = useState(initialErrorMessage ?? "Verifying your email...");

  useEffect(() => {
    if (!email || !token) {
      return;
    }

    const verificationEmail = email;
    const verificationToken = token;
    const controller = new AbortController();

    /**
     * Runs the verify email logic for this module.
     *
     * @returns The result used by the surrounding flow.
     */
    async function verifyEmail() {
      const params = new URLSearchParams({
        email: verificationEmail,
        token: verificationToken,
      });
      const response = await fetch(`${CLIENT_API_BASE_PATH}/auth/verify-email?${params.toString()}`, {
        method: "GET",
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setState("error");
        setMessage(payload?.error ?? "Unable to verify your email.");
        return;
      }

      setState("success");
      setMessage(payload?.message ?? "Email verified successfully. You can now sign in.");
    }

    verifyEmail().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setState("error");
      setMessage("Unable to verify your email.");
    });

    return () => controller.abort();
  }, [email, token]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto flex max-w-6xl justify-center px-4 py-10 sm:px-6 sm:py-16">
        <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold">
            {state === "loading" ? "Verifying your email" : state === "success" ? "Email verified" : "Verification failed"}
          </h1>
          <p className={`mt-4 text-sm ${state === "error" ? "text-red-600" : "text-zinc-600"}`}>{message}</p>
          <div className="mt-6">
            <Link
              className="inline-flex rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              href="/login"
            >
              {state === "success" ? "Sign in to continue" : "Go to sign in"}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Renders the /verify-email page.
 *
 * @returns The page UI.
 */
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailPageContent />
    </Suspense>
  );
}
