"use client";

import React, { useEffect, useState } from "react";
import AlertMessage from "@/components/ui/AlertMessage";

type OrganizationApplication = {
  id: number;
  applicantName: string;
  applicantEmail: string;
  organizationName: string;
  organizationEmail: string;
  organizationDomain: string;
  status: string;
  reviewNote: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  verificationExpiresAt: string | null;
  organizationEmailVerificationStatus: string;
  organizationEmailVerificationSentAt: string | null;
  organizationEmailVerifiedAt: string | null;
  domainVerified: boolean;
};

/**
 * Formats status for display.
 *
 * @param value - Input used by format status.
 *
 * @returns The formatted display value.
 */
function formatStatus(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Unknown";
}

/**
 * Formats date for display.
 *
 * @param value - Input used by format date.
 *
 * @returns The formatted display value.
 */
function formatDate(value: string | null) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

/**
 * Renders the /admin/organization-applications page.
 *
 * @returns The page UI.
 */
export default function AdminOrganizationApplicationsPage() {
  const [applications, setApplications] = useState<OrganizationApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [statusFilter, setStatusFilter] = useState("all");

  /**
   * Loads applications needed by this flow.
   *
   * @returns The result used by the surrounding flow.
   */
  async function loadApplications() {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/admin/organization-applications", { cache: "no-store" });
    const payload = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to load organization applications.");
      return;
    }
    const loaded = Array.isArray(payload?.applications) ? payload.applications : [];
    setApplications(loaded);
    setNotes(Object.fromEntries(loaded.map((application: OrganizationApplication) => [application.id, application.reviewNote || ""])));
  }

  useEffect(() => {
    void loadApplications();
  }, []);

  /**
   * Runs the review logic for this module.
   *
   * @param applicationId - Input used by review.
   * @param action - Input used by review.
   *
   * @returns The result used by the surrounding flow.
   */
  async function review(applicationId: number, action: "approve" | "reject") {
    setBusyId(applicationId);
    setError(null);
    const response = await fetch(`/api/admin/organization-applications/${applicationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note: notes[applicationId] ?? "" }),
    });
    const payload = await response.json().catch(() => null);
    setBusyId(null);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to review organization application.");
      return;
    }
    await loadApplications();
  }

  const statusOptions = Array.from(new Set(applications.map((application) => application.status).filter(Boolean)));
  const filteredApplications = applications.filter((application) => statusFilter === "all" || application.status === statusFilter);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
        <h1 className="text-2xl font-semibold">Organization user applications</h1>
        <AlertMessage className="mt-4 leading-6" role="status" tone="warning">
          Unknown organization-domain pairs require admin review. Once approved, the organization and email domain are mapped so future verified users from that domain can be approved automatically.
        </AlertMessage>

        {loading ? <div className="mt-6 text-sm text-zinc-600">Loading organization applications...</div> : null}
        {error ? <AlertMessage className="mt-6" role="alert" tone="error">{error}</AlertMessage> : null}

        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4">
          <label className="grid gap-2 text-sm font-medium text-zinc-700 sm:max-w-sm">
            Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900">
              <option value="all">All statuses</option>
              {statusOptions.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-8 grid gap-4">
          {filteredApplications.map((application) => {
            const isExpanded = expanded[application.id] === true;
            return (
              <article key={application.id} className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setExpanded((current) => ({ ...current, [application.id]: !isExpanded }))}
                  className="flex w-full flex-wrap items-center justify-between gap-4 px-6 py-5 text-left"
                  aria-expanded={isExpanded}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h2 className="text-lg font-semibold">{application.organizationName}</h2>
                      <span className="text-sm text-zinc-600">{application.organizationEmail}</span>
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {application.applicantName || application.applicantEmail} · Submitted {formatDate(application.submittedAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                      application.status === "approved" ? "bg-emerald-50 text-emerald-700" : application.status === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"
                    }`}>
                      {formatStatus(application.status)}
                    </span>
                    <span className="text-xs text-zinc-500">{isExpanded ? "Collapse" : "Expand"}</span>
                  </div>
                </button>

                {isExpanded ? (
                  <div className="border-t border-zinc-100 px-6 py-6">
                    {application.domainVerified ? (
                      <AlertMessage className="mb-4" role="status" tone="success">
                        This domain is already verified to be associated with {application.organizationName}. New verified submissions for this pair are approved automatically.
                      </AlertMessage>
                    ) : (
                      <AlertMessage className="mb-4" role="status" tone="warning">
                        No existing organization-domain mapping was found for {application.organizationName} and {application.organizationDomain}.
                      </AlertMessage>
                    )}

                    <dl className="grid gap-4 text-sm md:grid-cols-2">
                      <div><dt className="text-xs uppercase tracking-[0.14em] text-zinc-500">Organization</dt><dd className="mt-1 font-medium">{application.organizationName}</dd></div>
                      <div><dt className="text-xs uppercase tracking-[0.14em] text-zinc-500">Domain</dt><dd className="mt-1 font-medium">{application.organizationDomain}</dd></div>
                      <div>
                        <dt className="text-xs uppercase tracking-[0.14em] text-zinc-500">Organization email</dt>
                        <dd className="mt-1 flex flex-wrap items-center gap-2 font-medium">
                          <span>{application.organizationEmail}</span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            application.organizationEmailVerificationStatus === "verified"
                              ? "bg-emerald-50 text-emerald-700"
                              : application.organizationEmailVerificationStatus === "pending"
                                ? "bg-amber-50 text-amber-800"
                                : "bg-zinc-100 text-zinc-600"
                          }`}>
                            Email {formatStatus(application.organizationEmailVerificationStatus)}
                          </span>
                        </dd>
                      </div>
                      <div><dt className="text-xs uppercase tracking-[0.14em] text-zinc-500">Verification expires</dt><dd className="mt-1 font-medium">{formatDate(application.verificationExpiresAt)}</dd></div>
                    </dl>
                    {application.status === "pending" ? (
                      <>
                        <label className="mt-6 grid gap-2 text-sm font-medium text-zinc-700">
                          Review note
                          <textarea value={notes[application.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [application.id]: event.target.value }))} className="min-h-24 rounded-2xl border border-zinc-200 px-3 py-2" />
                        </label>
                        <div className="mt-6 flex justify-center gap-3">
                          <button type="button" disabled={busyId === application.id} onClick={() => review(application.id, "approve")} className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50">Approve</button>
                          <button type="button" disabled={busyId === application.id} onClick={() => review(application.id, "reject")} className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium disabled:opacity-50">Reject</button>
                        </div>
                      </>
                    ) : application.reviewNote ? (
                      <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">Note: {application.reviewNote}</div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
          {!loading && filteredApplications.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600">No organization applications found.</div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
