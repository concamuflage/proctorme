"use client";

import React, { useEffect, useState } from "react";

type ProctorApplication = {
  id: number;
  applicantName: string;
  applicantEmail: string;
  status: string;
  profession: string;
  gender: string;
  ethnicity: string;
  dateOfBirth: string;
  bio: string;
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  timezone: string;
  hourlyRate: number;
  minimumHours: number;
  maximumHours: number;
  education: Array<{
    degree: string;
    school: string;
    major: string;
    startMonth?: string;
    endMonth?: string;
    diplomaUrls?: string[];
    schoolEmail?: string;
    educationVerificationAuthorized?: boolean;
    schoolEmailVerificationStatus?: string;
  }>;
  imageUrls: string[];
  governmentIdUrls: string[];
  reviewNote?: string;
};

type ReviewOptions = {
  professions: string[];
  genders: string[];
  ethnicities: string[];
  schools: string[];
  majors: string[];
  timezones: string[];
};

const INPUT_CLASS = "w-full rounded-lg border border-zinc-200 bg-white px-3 py-1 text-sm leading-5 text-zinc-900";
const CUSTOM_INPUT_CLASS = "border-amber-300 bg-amber-50 ring-1 ring-amber-200";

function diplomaHref(url: string) {
  return url.startsWith("gcs://")
    ? `/api/admin/proctor-applications/diploma-file?url=${encodeURIComponent(url)}`
    : url;
}

function profileImageHref(url: string) {
  return url.startsWith("gcs://")
    ? `/api/admin/proctor-applications/profile-image-file?url=${encodeURIComponent(url)}`
    : url;
}

function governmentIdHref(url: string) {
  return url.startsWith("gcs://")
    ? `/api/admin/proctor-applications/government-id-file?url=${encodeURIComponent(url)}`
    : url;
}

export default function AdminProctorApplicationsPage() {
  const [applications, setApplications] = useState<ProctorApplication[]>([]);
  const [drafts, setDrafts] = useState<Record<number, ProctorApplication>>({});
  const [reviewOptions, setReviewOptions] = useState<ReviewOptions>({
    professions: [],
    genders: [],
    ethnicities: [],
    schools: [],
    majors: [],
    timezones: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function loadApplications() {
    setLoading(true);
    setError(null);
    const [response, optionsResponse] = await Promise.all([
      fetch("/api/admin/proctor-applications", { cache: "no-store" }),
      fetch("/api/admin/proctor-applications/options", { cache: "no-store" }),
    ]);
    const [payload, optionsPayload] = await Promise.all([
      response.json().catch(() => null),
      optionsResponse.json().catch(() => null),
    ]);
    setLoading(false);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to load applications.");
      return;
    }
    if (optionsResponse.ok) {
      setReviewOptions({
        professions: Array.isArray(optionsPayload?.professions) ? optionsPayload.professions : [],
        genders: Array.isArray(optionsPayload?.genders) ? optionsPayload.genders : [],
        ethnicities: Array.isArray(optionsPayload?.ethnicities) ? optionsPayload.ethnicities : [],
        schools: Array.isArray(optionsPayload?.schools) ? optionsPayload.schools : [],
        majors: Array.isArray(optionsPayload?.majors) ? optionsPayload.majors : [],
        timezones: Array.isArray(optionsPayload?.timezones) ? optionsPayload.timezones : [],
      });
    }
    const loadedApplications = Array.isArray(payload?.applications) ? payload.applications : [];
    setApplications(loadedApplications);
    setDrafts(Object.fromEntries(
      loadedApplications.map((application: ProctorApplication) => [
        application.id,
        {
          ...application,
          education: application.education.map((education) => ({ ...education })),
          imageUrls: [...application.imageUrls],
          governmentIdUrls: [...(application.governmentIdUrls ?? [])],
        },
      ])
    ));
  }

  useEffect(() => {
    void loadApplications();
  }, []);

  function updateDraft(applicationId: number, field: keyof ProctorApplication, value: string | number | string[]) {
    setDrafts((current) => ({
      ...current,
      [applicationId]: {
        ...current[applicationId],
        [field]: value,
      },
    }));
  }

  function updateEducation(applicationId: number, index: number, field: "degree" | "school" | "major" | "startMonth" | "endMonth" | "schoolEmail" | "schoolEmailVerificationStatus", value: string) {
    setDrafts((current) => ({
      ...current,
      [applicationId]: {
        ...current[applicationId],
        education: current[applicationId].education.map((education, educationIndex) =>
          educationIndex === index ? { ...education, [field]: value } : education
        ),
      },
    }));
  }

  function updateEducationBoolean(applicationId: number, index: number, field: "educationVerificationAuthorized", value: boolean) {
    setDrafts((current) => ({
      ...current,
      [applicationId]: {
        ...current[applicationId],
        education: current[applicationId].education.map((education, educationIndex) =>
          educationIndex === index ? { ...education, [field]: value } : education
        ),
      },
    }));
  }

  async function review(applicationId: number, action: "approve" | "reject") {
    setBusyId(applicationId);
    setError(null);
    const draft = drafts[applicationId];
    const response = await fetch(`/api/admin/proctor-applications/${applicationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, application: draft }),
    });
    const payload = await response.json().catch(() => null);
    setBusyId(null);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to review application.");
      return;
    }
    await loadApplications();
  }

  function isCustomValue(value: string | undefined, options: string[]) {
    const normalizedValue = (value || "").trim().toLowerCase();
    if (!normalizedValue) return false;
    return !options.some((option) => option.trim().toLowerCase() === normalizedValue);
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
        <h1 className="text-2xl font-semibold">Proctor applications</h1>
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Highlighted fields are custom values submitted through an "Other" choice. Review these carefully before approval; if approved, the value can become a standard lookup entry.
        </div>
        {loading ? <div className="mt-6 text-sm text-zinc-600">Loading applications...</div> : null}
        {error ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
        <div className="mt-8 grid gap-5">
          {applications.map((application) => {
            const draft = drafts[application.id] ?? application;
            const customProfession = isCustomValue(draft.profession, reviewOptions.professions);
            const customGender = isCustomValue(draft.gender, reviewOptions.genders);
            const customEthnicity = isCustomValue(draft.ethnicity, reviewOptions.ethnicities);
            return (
            <article key={application.id} className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <h2 className="text-lg font-semibold">{application.applicantName || application.applicantEmail}</h2>
                  <div className="text-sm text-zinc-600">{application.applicantEmail}</div>
                  <div className="inline-flex rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600">
                    {application.status}
                  </div>
                </div>
              </div>

              <div className="mt-8 grid gap-6">
                <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
                  <FormSection title="Profile basics">
                    <div className="grid gap-4 md:grid-cols-4">
                      <Field label="Profession">
                        <ReviewSelect
                          value={draft.profession}
                          onChange={(value) => updateDraft(application.id, "profession", value)}
                          options={reviewOptions.professions}
                          isCustom={customProfession}
                        />
                      </Field>
                      <Field label="Gender">
                        <ReviewInput
                          value={draft.gender}
                          onChange={(value) => updateDraft(application.id, "gender", value)}
                          isCustom={customGender}
                          minCh={9}
                        />
                      </Field>
                      <Field label="Ethnicity">
                        <ReviewSelect
                          value={draft.ethnicity}
                          onChange={(value) => updateDraft(application.id, "ethnicity", value)}
                          options={reviewOptions.ethnicities}
                          isCustom={customEthnicity}
                        />
                      </Field>
                      <Field label="Date of birth">
                        <TextFitInput type="date" value={draft.dateOfBirth} onChange={(value) => updateDraft(application.id, "dateOfBirth", value)} minCh={14} />
                      </Field>
                    </div>
                    <Field label="Self-introduction">
                    <textarea value={draft.bio} onChange={(event) => updateDraft(application.id, "bio", event.target.value)} className={`${INPUT_CLASS} min-h-24 resize-y py-2`} />
                    </Field>
                  </FormSection>
                  {draft.imageUrls[0] ? (
                    <a href={profileImageHref(draft.imageUrls[0])} target="_blank" rel="noreferrer" className="block h-full min-h-64">
                      <img
                        src={profileImageHref(draft.imageUrls[0])}
                        alt={`${application.applicantName || "Applicant"} profile`}
                        className="h-full w-full rounded-2xl border border-zinc-200 object-cover object-top shadow-sm"
                      />
                    </a>
                  ) : null}
                  {draft.governmentIdUrls.length > 0 ? (
                    <div className="grid content-start gap-2">
                      <div className="text-sm font-medium text-zinc-700">Government ID</div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {draft.governmentIdUrls.map((url) => (
                          <a key={url} href={governmentIdHref(url)} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-lg border border-zinc-200 bg-white px-3 text-zinc-700 underline">
                            Government ID
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <FormSection title="Current address">
                  <div className="grid gap-4 md:grid-cols-4">
                    <Field label="Street address" className="md:col-span-2">
                      <input value={draft.street} onChange={(event) => updateDraft(application.id, "street", event.target.value)} className={INPUT_CLASS} />
                    </Field>
                    <Field label="City">
                      <input value={draft.city} onChange={(event) => updateDraft(application.id, "city", event.target.value)} className={INPUT_CLASS} />
                    </Field>
                    <Field label="State">
                      <input value={draft.state} onChange={(event) => updateDraft(application.id, "state", event.target.value.toUpperCase())} className={INPUT_CLASS} />
                    </Field>
                    <Field label="Zip code">
                      <input value={draft.zipCode} onChange={(event) => updateDraft(application.id, "zipCode", event.target.value)} className={INPUT_CLASS} />
                    </Field>
                    <Field label="Country">
                      <input value={draft.country} onChange={(event) => updateDraft(application.id, "country", event.target.value)} className={INPUT_CLASS} />
                    </Field>
                    <Field label="IANA timezone" className="md:col-span-2">
                      <select value={draft.timezone} onChange={(event) => updateDraft(application.id, "timezone", event.target.value)} className={INPUT_CLASS}>
                        <option value="">Select a timezone</option>
                        {reviewOptions.timezones.map((timezone) => (
                          <option key={timezone} value={timezone}>
                            {timezone}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </FormSection>

                <FormSection title="Rates and session length">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Hourly rate">
                      <input type="number" min="1" step="1" value={draft.hourlyRate} onChange={(event) => updateDraft(application.id, "hourlyRate", Number(event.target.value))} className={INPUT_CLASS} />
                    </Field>
                    <Field label="Minimum hours per session">
                      <input type="number" min="0.5" step="0.5" value={draft.minimumHours} onChange={(event) => updateDraft(application.id, "minimumHours", Number(event.target.value))} className={INPUT_CLASS} />
                    </Field>
                    <Field label="Maximum hours per session">
                      <input type="number" min="0.5" step="0.5" value={draft.maximumHours} onChange={(event) => updateDraft(application.id, "maximumHours", Number(event.target.value))} className={INPUT_CLASS} />
                    </Field>
                  </div>
                </FormSection>

                <FormSection title="Education">
                  <div className="grid gap-4">
                    {draft.education.map((education, index) => (
                      <div key={index} className="grid gap-3 border-t border-zinc-100 pt-4 first:border-t-0 first:pt-0">
                        {(() => {
                          const customSchool = isCustomValue(education.school, reviewOptions.schools);
                          const customMajor = isCustomValue(education.major, reviewOptions.majors);
                          return (
                          <>
                        <div className="flex flex-wrap items-start gap-3">
                          <Field label="Degree">
                            <TextFitInput value={education.degree} onChange={(value) => updateEducation(application.id, index, "degree", value)} minCh={16} />
                          </Field>
                          <Field label="School">
                            <ReviewInput
                              value={education.school}
                              onChange={(value) => updateEducation(application.id, index, "school", value)}
                              isCustom={customSchool}
                              minCh={30}
                            />
                          </Field>
                          <Field label="Major">
                            <ReviewInput
                              value={education.major}
                              onChange={(value) => updateEducation(application.id, index, "major", value)}
                              isCustom={customMajor}
                              minCh={16}
                            />
                          </Field>
                        </div>
                          </>
                          );
                        })()}
                        <div className="flex flex-wrap items-start gap-3">
                          <Field label="Start">
                            <TextFitInput type="month" value={education.startMonth ?? ""} onChange={(value) => updateEducation(application.id, index, "startMonth", value)} minCh={24} fixedWidth />
                          </Field>
                          <Field label="End">
                            <TextFitInput type="month" value={education.endMonth ?? ""} onChange={(value) => updateEducation(application.id, index, "endMonth", value)} minCh={24} fixedWidth />
                          </Field>
                        </div>
                        <div className="flex flex-wrap items-end gap-5">
                          <div className="grid w-fit content-start gap-1 text-sm font-medium text-zinc-700">
                            Diploma
                            <div className="flex h-10 items-center text-sm text-zinc-600">
                              {(education.diplomaUrls ?? []).length > 0 ? (
                                <div className="flex flex-wrap gap-2 text-xs">
                                  {(education.diplomaUrls ?? []).map((url) => (
                                    <a key={url} href={diplomaHref(url)} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-lg border border-zinc-200 bg-white px-3 text-zinc-700 underline">
                                      Diploma
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                "No diploma uploaded"
                              )}
                            </div>
                          </div>
                          <Field label="School email address">
                            <TextFitInput
                              type="email"
                              value={education.schoolEmail ?? ""}
                              onChange={(value) => updateEducation(application.id, index, "schoolEmail", value)}
                              placeholder="name@school.edu"
                              minCh={28}
                            />
                          </Field>
                          <span className="pb-2 text-sm text-zinc-600">
                            {schoolEmailStatusText(education.schoolEmailVerificationStatus ?? (education.schoolEmail ? "pending" : "not_provided"))}
                          </span>
                        </div>
                        <label className="flex items-start gap-3 text-sm text-zinc-700">
                          <input
                            type="checkbox"
                            checked={education.educationVerificationAuthorized === true}
                            onChange={(event) => updateEducationBoolean(application.id, index, "educationVerificationAuthorized", event.target.checked)}
                            className="mt-1"
                          />
                          <span>Applicant authorized education verification</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </FormSection>

              </div>
              <div className="mt-8 flex justify-center gap-3 border-t border-zinc-100 pt-5">
                <button disabled={busyId === application.id || application.status === "approved"} onClick={() => review(application.id, "approve")} className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
                  Approve
                </button>
                <button disabled={busyId === application.id || application.status === "rejected"} onClick={() => review(application.id, "reject")} className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium disabled:opacity-50">
                  Reject
                </button>
              </div>
            </article>
            );
          })}
          {!loading && applications.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600">No applications found.</div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-zinc-100 pt-6 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold text-zinc-950">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`grid gap-1 text-sm font-medium text-zinc-700 ${className}`}>
      {label}
      {children}
    </label>
  );
}

function schoolEmailStatusText(status: string) {
  if (status === "verified") return "Email verified";
  if (status === "pending") return "Email pending";
  return "Email not provided";
}

function fitWidth(value: string, minCh: number) {
  const length = Math.max(minCh, value.length + 4);
  return { width: `min(${length}ch, 100%)` };
}

function TextFitInput({
  value,
  onChange,
  type = "text",
  placeholder,
  minCh = 16,
  fixedWidth = false,
}: {
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  minCh?: number;
  fixedWidth?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={`${INPUT_CLASS} h-10 max-w-full`}
      style={fixedWidth ? { width: `${minCh}ch` } : fitWidth(value || placeholder || "", minCh)}
    />
  );
}

function ReviewInput({
  value,
  onChange,
  isCustom,
  minCh = 12,
}: {
  value: string;
  onChange: (value: string) => void;
  isCustom: boolean;
  minCh?: number;
}) {
  return (
    <div className="grid gap-1">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${INPUT_CLASS} h-10 max-w-full ${isCustom ? CUSTOM_INPUT_CLASS : ""}`}
        style={fitWidth(value, minCh)}
      />
      {isCustom ? (
        <span className="w-fit rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">
          Custom value
        </span>
      ) : null}
    </div>
  );
}

function ReviewSelect({
  value,
  onChange,
  options,
  isCustom,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  isCustom: boolean;
}) {
  return (
    <div className="grid gap-1">
      <select
        value={options.includes(value) ? value : ""}
        onChange={(event) => onChange(event.target.value)}
        className={`${INPUT_CLASS} h-10 max-w-full ${isCustom ? CUSTOM_INPUT_CLASS : ""}`}
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {isCustom ? (
        <span className="w-fit rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">
          Custom value: {value}
        </span>
      ) : null}
    </div>
  );
}
