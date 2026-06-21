"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AlertMessage from "@/components/ui/AlertMessage";

type VerificationState = "loading" | "success" | "error";

/**
 * Renders the verify organization email page content component.
 *
 * @returns The rendered UI for this component.
 */
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

    /**
     * Runs the verify organization email logic for this module.
     *
     * @returns The result used by the surrounding flow.
     */
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
          <AlertMessage className="mt-4" role={state === "error" ? "alert" : "status"} tone={state === "error" ? "error" : state === "success" ? "success" : "info"}>{message}</AlertMessage>
        </div>
      </main>
    </div>
  );
}

/**
 * Renders the /verify-organization-email page.
 *
 * @returns The page UI.
 */
export default function VerifyOrganizationEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOrganizationEmailPageContent />
    </Suspense>
  );
}
