"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type VerificationState = "loading" | "success" | "error";

function VerifySchoolEmailPageContent() {
  const searchParams = useSearchParams();
  const applicationId = searchParams.get("applicationId");
  const educationIndex = searchParams.get("educationIndex");
  const email = searchParams.get("email");
  const token = searchParams.get("token");
  const initialErrorMessage = !applicationId || !educationIndex || !email || !token
    ? "This school email verification link is incomplete."
    : null;
  const [state, setState] = useState<VerificationState>(initialErrorMessage ? "error" : "loading");
  const [message, setMessage] = useState(initialErrorMessage ?? "Verifying your school email...");

  useEffect(() => {
    if (!applicationId || !educationIndex || !email || !token) return;

    const params = new URLSearchParams({
      applicationId,
      educationIndex,
      email,
      token,
    });
    const controller = new AbortController();

    async function verifySchoolEmail() {
      const response = await fetch(`/api/account/proctor-application/verify-school-email?${params.toString()}`, {
        method: "GET",
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setState("error");
        setMessage(payload?.error ?? payload?.message ?? "Unable to verify your school email.");
        return;
      }

      setState("success");
      setMessage(payload?.message ?? "School email verified successfully.");
    }

    verifySchoolEmail().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setState("error");
      setMessage("Unable to verify your school email.");
    });

    return () => controller.abort();
  }, [applicationId, educationIndex, email, token]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto flex max-w-6xl justify-center px-4 py-10 sm:px-6 sm:py-16">
        <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold">
            {state === "loading" ? "Verifying school email" : state === "success" ? "School email verified" : "Verification failed"}
          </h1>
          <p className={`mt-4 text-sm ${state === "error" ? "text-red-600" : "text-zinc-600"}`}>{message}</p>
          <div className="mt-6">
            <Link
              className="inline-flex rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              href="/account/proctor-verification"
            >
              Back to application
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function VerifySchoolEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifySchoolEmailPageContent />
    </Suspense>
  );
}
