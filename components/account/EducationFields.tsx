"use client";

import React from "react";

export type EducationInput = {
  degree: string;
  school: string;
  customSchool: string;
  major: string;
  customMajor: string;
  startMonth: string;
  endMonth: string;
  diplomaUrls: string[];
  schoolEmail: string;
  educationVerificationAuthorized: boolean;
  schoolEmailVerificationStatus: string;
};

export const EMPTY_EDUCATION: EducationInput = {
  degree: "",
  school: "",
  customSchool: "",
  major: "",
  customMajor: "",
  startMonth: "",
  endMonth: "",
  diplomaUrls: [],
  schoolEmail: "",
  educationVerificationAuthorized: false,
  schoolEmailVerificationStatus: "not_provided",
};

type EducationFieldsProps = {
  degreeOptions: string[];
  education: EducationInput[];
  inputClassName: string;
  majorOptions: string[];
  onAddEducation: () => void;
  onBooleanChange: (index: number, field: "educationVerificationAuthorized", value: boolean) => void;
  onChange: (index: number, field: keyof EducationInput, value: string) => void;
  onDiplomaUpload: (index: number, file: File | null) => void;
  onRemoveEducation?: (index: number) => void;
  schoolOptions: string[];
  siteName: string;
  uploadingEducationIndex: number | null;
};

/**
 * Runs the diploma href logic for this module.
 *
 * @param url - Input used by diploma href.
 *
 * @returns The result used by the surrounding flow.
 */
function diplomaHref(url: string) {
  return url.startsWith("gcs://")
    ? `/api/account/proctor-application/diploma-file?url=${encodeURIComponent(url)}`
    : url;
}

/**
 * Renders the field component.
 *
 * @param label, children - Input used by field.
 *
 * @returns The rendered UI for this component.
 */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-zinc-700">
      {label}
      {children}
    </label>
  );
}

/**
 * Renders the education fields component.
 *
 * @param degreeOptions,
  education,
  inputClassName,
  majorOptions,
  onAddEducation,
  onBooleanChange,
  onChange,
  onDiplomaUpload,
  onRemoveEducation,
  schoolOptions,
  siteName,
  uploadingEducationIndex, - Input used by education fields.
 *
 * @returns The rendered UI for this component.
 */
export default function EducationFields({
  degreeOptions,
  education,
  inputClassName,
  majorOptions,
  onAddEducation,
  onBooleanChange,
  onChange,
  onDiplomaUpload,
  onRemoveEducation,
  schoolOptions,
  siteName,
  uploadingEducationIndex,
}: EducationFieldsProps) {
  /**
   * Updates degree while preserving the surrounding form state.
   *
   * @param index - Input used by update degree.
   * @param value - Input used by update degree.
   *
   * @returns The result used by the surrounding flow.
   */
  function updateDegree(index: number, value: string) {
    onChange(index, "degree", value);
  }

  return (
    <div className="grid gap-4">
      {education.map((item, index) => (
        <div key={index} className="grid items-start gap-3 border-t border-zinc-100 pt-4 first:border-t-0 first:pt-0 md:grid-cols-4">
          {education.length > 1 && onRemoveEducation ? (
            <div className="flex justify-end md:col-span-4">
              <button
                type="button"
                onClick={() => onRemoveEducation(index)}
                className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:border-red-300 hover:text-red-700"
              >
                Remove education
              </button>
            </div>
          ) : null}
          <div className="grid gap-2">
            <select value={item.degree} onChange={(e) => updateDegree(index, e.target.value)} className={inputClassName} required>
              <option value="">Select a degree</option>
              {degreeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div className={`grid gap-3 ${item.school === "Other" ? "grid-cols-2 md:col-span-2" : ""}`}>
            <select value={item.school} onChange={(e) => onChange(index, "school", e.target.value)} className={inputClassName} required>
              <option value="">Select a school</option>
              {schoolOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            {item.school === "Other" ? (
              <input value={item.customSchool} onChange={(e) => onChange(index, "customSchool", e.target.value)} className={inputClassName} placeholder="Enter school" required />
            ) : null}
          </div>
          <div className={`grid gap-3 ${item.major === "Other" ? "grid-cols-2 md:col-span-2" : ""}`}>
            <select
              value={item.major}
              onChange={(e) => onChange(index, "major", e.target.value)}
              className={inputClassName}
              required
            >
              <option value="">Select a major</option>
              {majorOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            {item.major === "Other" ? (
              <input value={item.customMajor} onChange={(e) => onChange(index, "customMajor", e.target.value)} className={inputClassName} placeholder="Enter major" required />
            ) : null}
          </div>
          <div className="grid grid-cols-2 content-start gap-3 md:col-span-4 md:grid-cols-4">
            <input type="month" value={item.startMonth} onChange={(e) => onChange(index, "startMonth", e.target.value)} className={inputClassName} />
            <input type="month" value={item.endMonth} onChange={(e) => onChange(index, "endMonth", e.target.value)} className={inputClassName} />
          </div>
          <div className="grid content-start gap-2 md:col-span-2">
            <Field label="Diploma">
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  onDiplomaUpload(index, e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
                className={inputClassName}
                required={item.diplomaUrls.length === 0}
              />
            </Field>
            <div className="min-h-5 text-xs leading-5 text-zinc-500">
              Accepted formats: PDF, JPG, JPEG, PNG. Maximum file size: 5 MB.
            </div>
            <div className="min-h-8">
              {uploadingEducationIndex === index ? <div className="text-xs leading-8 text-zinc-500">Uploading diploma...</div> : null}
              {item.diplomaUrls.length > 0 ? (
                <div className="flex flex-wrap gap-2 text-xs">
                  {item.diplomaUrls.map((url) => (
                    <a key={url} href={diplomaHref(url)} target="_blank" rel="noreferrer" className="rounded-full border border-zinc-200 px-3 py-1 text-zinc-700 underline">
                      Diploma
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className="grid content-start gap-2 md:col-span-2">
            <Field label="School email address">
              <input
                type="email"
                value={item.schoolEmail}
                onChange={(e) => onChange(index, "schoolEmail", e.target.value)}
                className={inputClassName}
                placeholder="name@school.edu"
              />
            </Field>
            <div className="min-h-5 text-xs leading-5 text-zinc-500">
              Optional. If provided, we will send a verification email.
            </div>
            <div className="min-h-8">
              {item.schoolEmail ? (
                <div className="text-xs leading-8 text-zinc-500">
                  School email verification status: {item.schoolEmailVerificationStatus === "verified" ? "verified" : "pending"}
                </div>
              ) : null}
            </div>
          </div>
          <label className="flex items-start gap-3 text-sm text-zinc-700 md:col-span-4">
            <input
              type="checkbox"
              checked={item.educationVerificationAuthorized}
              onChange={(e) => onBooleanChange(index, "educationVerificationAuthorized", e.target.checked)}
              className="mt-1"
              required
            />
            <span>I authorize {siteName} to verify this education record and the validity of the uploaded diploma.</span>
          </label>
        </div>
      ))}
      <button type="button" onClick={onAddEducation} className="w-fit rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium hover:border-zinc-500">
        Add education
      </button>
    </div>
  );
}
