"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type VerificationState = "loading" | "success" | "error";

function VerifyOrganizationEmailPageContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const token = searchParams.get("token");
  const initialErrorMessage = !email || !token ? "This organization email verification link is incomplete." : null;
  const [state, setState] = useState<VerificationState>(initialErrorMessage ? "error" : "loading");
  const [message, setMessage] = useState(initialErrorMessage ?? "Verifying your organization email...");

  useEffect(() => {
    if (!email || !token) return;

    const params = new URLSearchParams({ email, token });
    const controller = new AbortController();

    async function verifyOrganizationEmail() {
      const response = await fetch(`/api/account/organization-application/verify-email?${params.toString()}`, {
        method: "GET",
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setState("error");
        setMessage(payload?.error ?? payload?.message ?? "Unable to verify your organization email.");
        return;
      }

      setState("success");
      setMessage(payload?.message ?? "Organization email verified successfully.");
    }

    verifyOrganizationEmail().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setState("error");
      setMessage("Unable to verify your organization email.");
    });

    return () => controller.abort();
  }, [email, token]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto flex max-w-6xl justify-center px-4 py-10 sm:px-6 sm:py-16">
        <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold">
            {state === "loading" ? "Verifying organization email" : state === "success" ? "Organization email verified" : "Verification failed"}
          </h1>
          <p className={`mt-4 text-sm ${state === "error" ? "text-red-600" : "text-zinc-600"}`}>{message}</p>
        </div>
      </main>
    </div>
  );
}

export default function VerifyOrganizationEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOrganizationEmailPageContent />
    </Suspense>
  );
}
