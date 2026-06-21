"use client";

import React, { useEffect, useState } from "react";
import ProfileChangeRequestList from "@/components/profile/ProfileChangeRequestList";
import AlertMessage from "@/components/ui/AlertMessage";

type ProfileChangeRequest = {
  id: number;
  applicantName: string;
  applicantEmail: string;
  changeType: string;
  status: string;
  oldValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewNote: string;
};

/**
 * Formats change type for display.
 *
 * @param value - Input used by format change type.
 *
 * @returns The formatted display value.
 */
function formatChangeType(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Renders the /admin/profile-change-requests page.
 *
 * @returns The page UI.
 */
export default function AdminProfileChangeRequestsPage() {
  const [requests, setRequests] = useState<ProfileChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  /**
   * Loads requests needed by this flow.
   *
   * @returns The result used by the surrounding flow.
   */
  async function loadRequests() {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/admin/profile-change-requests", { cache: "no-store" });
    const payload = await response.json().catch(() => null);
    setLoading(false);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to load profile change requests.");
      return;
    }
    const loadedRequests = Array.isArray(payload?.requests) ? payload.requests : [];
    setRequests(loadedRequests);
    setNotes(Object.fromEntries(
      loadedRequests.map((request: ProfileChangeRequest) => [request.id, request.reviewNote || ""])
    ));
  }

  useEffect(() => {
    void loadRequests();
  }, []);

  /**
   * Runs the review logic for this module.
   *
   * @param requestId - Input used by review.
   * @param action - Input used by review.
   *
   * @returns The result used by the surrounding flow.
   */
  async function review(requestId: number, action: "approve" | "reject") {
    setBusyId(requestId);
    setError(null);
    const response = await fetch(`/api/admin/profile-change-requests/${requestId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note: notes[requestId] ?? "" }),
    });
    const payload = await response.json().catch(() => null);
    setBusyId(null);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to review profile change request.");
      return;
    }
    await loadRequests();
  }

  const statusOptions = Array.from(new Set(requests.map((request) => request.status).filter(Boolean)));
  const typeOptions = Array.from(new Set(requests.map((request) => request.changeType).filter(Boolean)));
  const filteredRequests = requests.filter((request) =>
    (statusFilter === "all" || request.status === statusFilter) &&
    (typeFilter === "all" || request.changeType === typeFilter)
  );

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
        <h1 className="text-2xl font-semibold">Profile change requests</h1>
        <AlertMessage className="mt-4 leading-6" role="status" tone="warning">
          Review profile changes that cannot be applied immediately. Custom cities should be checked before approval because approval adds the city to lookup data and updates the proctor's public profile address.
        </AlertMessage>

        {loading ? <div className="mt-6 text-sm text-zinc-600">Loading profile change requests...</div> : null}
        {error ? <AlertMessage className="mt-6" role="alert" tone="error">{error}</AlertMessage> : null}

        <div className="mt-6 grid gap-4 rounded-2xl border border-zinc-200 bg-white p-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-zinc-700">
            Status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
            >
              <option value="all">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {formatChangeType(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-zinc-700">
            Type
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
            >
              <option value="all">All types</option>
              {typeOptions.map((type) => (
                <option key={type} value={type}>
                  {formatChangeType(type)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-8">
          <ProfileChangeRequestList
            busyId={busyId}
            emptyMessage="No profile change requests found."
            error={null}
            loading={loading}
            notes={notes}
            onNoteChange={(requestId, note) => setNotes((current) => ({ ...current, [requestId]: note }))}
            onReview={review}
            requests={filteredRequests}
            showApplicant
            showReviewControls
            title=""
            withTopBorder={false}
          />
        </div>
      </main>
    </div>
  );
}
