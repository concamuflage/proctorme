"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AlertMessage from "@/components/ui/AlertMessage";

type RoleVerificationClientProps = {
  role: "corporate" | "proctor";
};

const ROLE_COPY = {
  corporate: {
    title: "Corporate verification",
    body: "Verify your organization before booking proctors for interviews, assessments, and hiring events.",
    pending: "Verify your organization email before submitting.",
    complete: "Organization submitted.",
  },
  proctor: {
    title: "Proctor verification",
    body: "Verify your proctor profile before accepting assignments.",
    pending: "Preparing proctor verification...",
    complete: "Proctor role added. Proctor verification can continue from here.",
  },
};

/**
 * Renders the role verification client component.
 *
 * @param role - Input used by role verification client.
 *
 * @returns The rendered UI for this component.
 */
export default function RoleVerificationClient({ role }: RoleVerificationClientProps) {
  const { status } = useSession();
  const router = useRouter();
  const [message, setMessage] = useState(ROLE_COPY[role].pending);
  const [error, setError] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [organizationEmail, setOrganizationEmail] = useState("");
  const [emailVerificationStatus, setEmailVerificationStatus] = useState<"not_sent" | "pending" | "verified">("not_sent");
  const [sendingVerification, setSendingVerification] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formOpen, setFormOpen] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      router.replace(`/login?callbackUrl=${encodeURIComponent(role === "corporate" ? "/account/corporate-verification" : "/account/proctor-verification")}`);
      return;
    }

    if (role === "corporate") {
      setMessage(ROLE_COPY[role].pending);
      void fetch("/api/account/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "corporate" }),
      }).catch(() => null);
      return;
    }

    let cancelled = false;
    /**
     * Runs the add role logic for this module.
     *
     * @returns The result used by the surrounding flow.
     */
    async function addRole() {
      setError(null);
      setMessage(ROLE_COPY[role].pending);

      try {
        const response = await fetch("/api/account/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || "Unable to add role.");
        if (!cancelled) setMessage(ROLE_COPY[role].complete);
      } catch (addRoleError) {
        if (!cancelled) {
          setError(addRoleError instanceof Error ? addRoleError.message : "Unable to add role.");
        }
      }
    }

    void addRole();

    return () => {
      cancelled = true;
    };
  }, [role, router, status]);

  /**
   * Sends organization email verification for this flow.
   *
   * @returns The result used by the surrounding flow.
   */
  async function sendOrganizationEmailVerification() {
    setError(null);
    setSendingVerification(true);
    const response = await fetch("/api/account/organization-application/send-email-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationName, organizationEmail }),
    });
    const payload = await response.json().catch(() => null);
    setSendingVerification(false);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to send organization email verification.");
      return;
    }
    setEmailVerificationStatus("pending");
    setMessage("Verification email sent. Open the link in that email before submitting this application.");
  }

  /**
   * Runs the refresh organization email verification status logic for this module.
   *
   * @returns The result used by the surrounding flow.
   */
  async function refreshOrganizationEmailVerificationStatus() {
    if (!organizationEmail) return;
    const params = new URLSearchParams({ organizationEmail });
    const response = await fetch(`/api/account/organization-application/send-email-verification?${params.toString()}`, {
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) return;
    if (payload?.status === "verified") {
      setEmailVerificationStatus("verified");
      setMessage("Organization email verified. You can submit the application.");
    } else if (payload?.status === "pending") {
      setEmailVerificationStatus("pending");
    }
  }

  useEffect(() => {
    if (role !== "corporate" || emailVerificationStatus !== "pending") return;

    /**
     * Handles focus for this component.
     *
     * @returns The result used by the surrounding flow.
     */
    function handleFocus() {
      void refreshOrganizationEmailVerificationStatus();
    }

    window.addEventListener("focus", handleFocus);
    const intervalId = window.setInterval(() => {
      void refreshOrganizationEmailVerificationStatus();
    }, 5000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.clearInterval(intervalId);
    };
  }, [emailVerificationStatus, organizationEmail, role]);

  /**
   * Runs the submit corporate application logic for this module.
   *
   * @param event - Input used by submit corporate application.
   *
   * @returns The result used by the surrounding flow.
   */
  async function submitCorporateApplication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (emailVerificationStatus !== "verified") {
      setError("Verify your organization email before submitting.");
      return;
    }
    setMessage(ROLE_COPY.corporate.pending);
    setSubmitting(true);
    const response = await fetch("/api/account/organization-application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationName,
        organizationEmail,
      }),
    });
    const payload = await response.json().catch(() => null);
    setSubmitting(false);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to submit organization application.");
      return;
    }
    setSubmitted(true);
    setMessage(payload?.application?.status === "approved"
      ? "Organization verified. Corporate access is active."
      : "Organization application submitted. An admin will review it because this organization and email domain are not mapped yet.");
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold">{ROLE_COPY[role].title}</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">{ROLE_COPY[role].body}</p>

          <AlertMessage className="mt-6" role={error ? "alert" : "status"} tone={error ? "error" : "info"}>
            {error ?? message}
          </AlertMessage>

          {role === "corporate" && formOpen && !submitted ? (
            <form onSubmit={submitCorporateApplication} className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                Organization name
                <input value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} className="rounded-2xl border border-zinc-200 px-3 py-3 text-sm text-zinc-900" required />
              </label>
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                Organization email
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input
                    type="email"
                    value={organizationEmail}
                    onChange={(event) => {
                      setOrganizationEmail(event.target.value);
                      setEmailVerificationStatus("not_sent");
                    }}
                    className="rounded-2xl border border-zinc-200 px-3 py-3 text-sm text-zinc-900"
                    required
                  />
                  <button
                    type="button"
                    onClick={sendOrganizationEmailVerification}
                    disabled={sendingVerification || !organizationEmail}
                    className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 disabled:opacity-50"
                  >
                    {sendingVerification ? "Sending..." : "Send verification"}
                  </button>
                </div>
                <span className={`text-xs font-normal ${
                  emailVerificationStatus === "verified" ? "text-emerald-700" : emailVerificationStatus === "pending" ? "text-amber-700" : "text-zinc-500"
                }`}>
                  {emailVerificationStatus === "verified"
                    ? "Organization email verified."
                    : emailVerificationStatus === "pending"
                      ? "Verification email sent. After clicking the email link, return here and continue."
                      : "Verify this email before submitting."}
                </span>
              </label>
              <div className="text-xs leading-5 text-zinc-500">
                If this organization and email domain are already mapped, corporate access is approved immediately. Otherwise, an admin will review the organization before access is added.
              </div>
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={submitting || emailVerificationStatus !== "verified"}
                  className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit for admin review"}
                </button>
              </div>
            </form>
          ) : null}
        </section>
      </main>
    </div>
  );
}
