"use client";

import React, { useState } from "react";

export type ProfileChangeRequestListItem = {
  id: number;
  applicantName?: string;
  applicantEmail?: string;
  changeType: string;
  status: string;
  oldValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewNote: string;
};

type ProfileChangeRequestListProps = {
  busyId?: number | null;
  emptyMessage?: string;
  error: string | null;
  loading: boolean;
  notes?: Record<number, string>;
  onEditRequest?: (request: ProfileChangeRequestListItem) => void;
  onNoteChange?: (requestId: number, note: string) => void;
  onReview?: (requestId: number, action: "approve" | "reject") => void;
  requests: ProfileChangeRequestListItem[];
  showApplicant?: boolean;
  showReviewControls?: boolean;
  title?: string;
  withTopBorder?: boolean;
};

/**
 * Runs the value text logic for this module.
 *
 * @param values - Input used by value text.
 * @param key - Input used by value text.
 *
 * @returns The result used by the surrounding flow.
 */
function valueText(values: Record<string, unknown>, key: string) {
  const value = values[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

/**
 * Normalizes d value into the shape this flow expects.
 *
 * @param values - Input used by normalized value.
 * @param key - Input used by normalized value.
 *
 * @returns The normalized value.
 */
function normalizedValue(values: Record<string, unknown>, key: string) {
  return valueText(values, key).trim().toLowerCase();
}

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
 * Formats date time for display.
 *
 * @param value - Input used by format date time.
 *
 * @returns The formatted display value.
 */
function formatDateTime(value: string | null | undefined) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

/**
 * Runs the status class name logic for this module.
 *
 * @param status - Input used by status class name.
 *
 * @returns The result used by the surrounding flow.
 */
function statusClassName(status: string) {
  if (status === "approved") return "bg-emerald-50 text-emerald-700";
  if (status === "rejected") return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-800";
}

/**
 * Runs the education rows logic for this module.
 *
 * @param values - Input used by education rows.
 *
 * @returns The result used by the surrounding flow.
 */
function educationRows(values: Record<string, unknown>) {
  const value = values.education;
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => item !== null && typeof item === "object" && !Array.isArray(item)) : [];
}

/**
 * Renders the request panel component.
 *
 * @param compareValues,
  requestType,
  title,
  values, - Input used by request panel.
 *
 * @returns The rendered UI for this component.
 */
function RequestPanel({
  compareValues,
  requestType,
  title,
  values,
}: {
  compareValues?: Record<string, unknown>;
  requestType: string;
  title: string;
  values: Record<string, unknown>;
}) {
  if (requestType === "education") {
    return <EducationPanel compareValues={compareValues} title={title} values={values} />;
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <h3 className="text-sm font-semibold text-zinc-950">{title}</h3>
      <dl className="mt-4 grid gap-3 text-sm">
        {[
          ["Street address", "street"],
          ["City", "city"],
          ["State", "state"],
          ["Zip code", "zipCode"],
          ["Country", "country"],
        ].map(([label, key]) => {
          const changed = compareValues ? normalizedValue(values, key) !== normalizedValue(compareValues, key) : false;
          return (
            <div
              key={key}
              className={`grid gap-1 rounded-xl p-2 ${changed ? "border border-amber-300 bg-amber-50 ring-1 ring-amber-200" : ""}`}
            >
              <dt className="text-xs uppercase tracking-[0.14em] text-zinc-500">{label}</dt>
              <dd className="font-medium text-zinc-900">{valueText(values, key) || "Not provided"}</dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

/**
 * Renders the education panel component.
 *
 * @param compareValues,
  title,
  values, - Input used by education panel.
 *
 * @returns The rendered UI for this component.
 */
function EducationPanel({
  compareValues,
  title,
  values,
}: {
  compareValues?: Record<string, unknown>;
  title: string;
  values: Record<string, unknown>;
}) {
  const rows = educationRows(values);
  const compareRows = compareValues ? educationRows(compareValues) : [];

  return (
    <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <h3 className="text-sm font-semibold text-zinc-950">{title}</h3>
      <div className="mt-4 grid gap-3 text-sm">
        {rows.length > 0 ? rows.map((education, index) => {
          const compareEducation = compareRows[index] ?? {};
          const changed = compareValues ? ["degree", "major", "school", "startMonth", "endMonth"]
            .some((key) => normalizedValue(education, key) !== normalizedValue(compareEducation, key)) : false;
          return (
            <div key={index} className={`grid gap-1 rounded-xl p-2 ${changed ? "border border-amber-300 bg-amber-50 ring-1 ring-amber-200" : ""}`}>
              <div className="font-medium text-zinc-900">
                {[valueText(education, "degree"), valueText(education, "major")].filter(Boolean).join(" - ") || "Education"}
              </div>
              <div className="text-zinc-700">{valueText(education, "school") || "School not provided"}</div>
              <div className="text-xs text-zinc-500">
                {[valueText(education, "startMonth"), valueText(education, "endMonth")].filter(Boolean).join(" to ") || "Dates not provided"}
              </div>
              {Array.isArray(education.diplomaUrls) && education.diplomaUrls.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                  {education.diplomaUrls.filter((url): url is string => typeof url === "string").map((url) => (
                    <a key={url} href={`/api/admin/proctor-applications/diploma-file?url=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer" className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-zinc-700 underline">
                      Diploma
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          );
        }) : (
          <div className="text-zinc-600">No education records.</div>
        )}
      </div>
    </section>
  );
}

/**
 * Renders the profile change request list component.
 *
 * @param busyId = null,
  emptyMessage = "No profile change requests yet.",
  error,
  loading,
  notes = ,
  onEditRequest,
  onNoteChange,
  onReview,
  requests,
  showApplicant = false,
  showReviewControls = false,
  title = "Request history",
  withTopBorder = true, - Input used by profile change request list.
 *
 * @returns The rendered UI for this component.
 */
export default function ProfileChangeRequestList({
  busyId = null,
  emptyMessage = "No profile change requests yet.",
  error,
  loading,
  notes = {},
  onEditRequest,
  onNoteChange,
  onReview,
  requests,
  showApplicant = false,
  showReviewControls = false,
  title = "Request history",
  withTopBorder = true,
}: ProfileChangeRequestListProps) {
  const [expandedRequests, setExpandedRequests] = useState<Record<number, boolean>>({});

  return (
    <section className={withTopBorder ? "mt-2 border-t border-zinc-100 pt-5" : "mt-0"}>
      {title ? <h3 className="text-sm font-semibold text-zinc-950">{title}</h3> : null}
      {loading ? <div className="mt-3 text-sm text-zinc-500">Loading request history...</div> : null}
      {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}
      {!loading && requests.length === 0 ? (
        <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
          {emptyMessage}
        </div>
      ) : null}
      <div className="mt-3 grid gap-3">
        {requests.map((request) => {
          const isExpanded = expandedRequests[request.id] === true;
          return (
            <article key={request.id} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white text-sm">
              <button
                type="button"
                onClick={() => setExpandedRequests((current) => ({ ...current, [request.id]: !isExpanded }))}
                className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 text-left"
                aria-expanded={isExpanded}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-medium text-zinc-950">{formatStatus(request.changeType)} change</span>
                    {showApplicant ? (
                      <>
                        <span className="text-sm text-zinc-700">{request.applicantName || request.applicantEmail}</span>
                        <span className="text-xs text-zinc-500">{request.applicantEmail}</span>
                      </>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    Submitted {formatDateTime(request.submittedAt)}
                    {request.reviewedAt ? ` · Reviewed ${formatDateTime(request.reviewedAt)}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusClassName(request.status)}`}>
                    {formatStatus(request.status)}
                  </span>
                  <span className="text-xs text-zinc-500">{isExpanded ? "Collapse" : "Expand"}</span>
                </div>
              </button>

              {isExpanded ? (
                <div className="border-t border-zinc-100 px-4 py-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <RequestPanel title="Current at submission" requestType={request.changeType} values={request.oldValues} />
                    <RequestPanel title="Requested" requestType={request.changeType} values={request.newValues} compareValues={request.oldValues} />
                  </div>

                  {showReviewControls && request.status === "pending" ? (
                    <label className="mt-5 grid gap-2 text-sm font-medium text-zinc-700">
                      Review note
                      <textarea
                        value={notes[request.id] ?? ""}
                        onChange={(event) => onNoteChange?.(request.id, event.target.value)}
                        className="min-h-24 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                        placeholder="Add a note for approval or rejection."
                      />
                    </label>
                  ) : null}

                  {request.reviewNote ? (
                    <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
                      <span className="font-medium text-zinc-950">Admin note:</span> {request.reviewNote}
                    </div>
                  ) : null}

                  {showReviewControls ? (
                    <div className="mt-6 border-t border-zinc-100 pt-5">
                      {request.status === "pending" ? (
                        <div className="flex justify-center gap-3">
                          <button
                            type="button"
                            disabled={busyId === request.id}
                            onClick={() => onReview?.(request.id, "approve")}
                            className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={busyId === request.id}
                            onClick={() => onReview?.(request.id, "reject")}
                            className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <div className={`rounded-2xl border p-4 text-sm ${
                          request.status === "approved"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-red-200 bg-red-50 text-red-700"
                        }`}>
                          This request was {request.status}.
                        </div>
                      )}
                    </div>
                  ) : null}

                  {!showReviewControls && request.status === "rejected" ? (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-zinc-500">
                        You can edit and submit again. A new request will be created; this rejected request remains in history.
                      </div>
                      {onEditRequest ? (
                        <button
                          type="button"
                          onClick={() => onEditRequest(request)}
                          className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-800 hover:border-zinc-500"
                        >
                          Edit
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
