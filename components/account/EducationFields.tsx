"use client";

import React from "react";
import UploadField from "@/components/account/UploadField";
import type { EducationInput } from "@/components/account/proctor-application/formTypes";
import { EDUCATION_EMAIL_PATTERN } from "@/lib/schoolEmail";

/**
 * Empty education row used when a user starts the form or clicks "Add education".
 *
 * Example: a new form starts with `education` shaped as `[{ ...EMPTY_EDUCATION }]`.
 */
export const EMPTY_EDUCATION: EducationInput = {
  degree: "",
  school: "",
  customSchool: "",
  major: "",
  customMajor: "",
  startMonth: "",
  endMonth: "",
  diplomaUrl: "",
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
  onChange: <Field extends keyof EducationInput>(index: number, field: Field, value: EducationInput[Field]) => void;
  onDiplomaUpload: (index: number, file: File | null) => void;
  onRemoveEducation?: (index: number) => void;
  onSendSchoolEmailVerification?: (index: number) => void;
  schoolOptions: string[];
  sendingSchoolEmailIndex?: number | null;
  showAddEducationButton?: boolean;
  siteName: string;
  uploadingEducationIndex: number | null;
};

/**
 * Converts stored diploma locations into browser-openable links.
 *
 * @param url - Stored diploma URL, for example `gcs://bucket/path/diploma.pdf`.
 *
 * @returns A browser URL that can open the diploma file.
 */
function diplomaHref(url: string) {
  return url.startsWith("gcs://")
    ? `/api/account/proctor-application/diploma-file?url=${encodeURIComponent(url)}`
    : url;
}

/**
 * Builds a readable diploma file label from the stored diploma URL.
 *
 * @param url - Stored diploma URL or private object URI, for example `gcs://bucket/path/diploma.pdf`.
 *
 * @returns A compact label for the uploaded diploma, for example `diploma.pdf`.
 */
function diplomaFileLabel(url: string) {
  const rawName = url.split("/").pop() || "Diploma";
  const decodedName = decodeURIComponent(rawName);
  return decodedName || "Diploma";
}

/**
 * Formats the school email verification status for display.
 *
 * @param status - Stored verification status, for example `pending`.
 *
 * @returns A readable status label, for example `Pending verification`.
 */
function schoolEmailStatusLabel(status: string) {
  if (status === "verified") return "Verified";
  if (status === "pending") return "Pending verification";
  return "Not sent";
}

/**
 * Renders editable education entries for account and proctor application forms.
 *
 * @param props - Education form data and callbacks. For example, `showAddEducationButton={false}` lets a wizard render that action in its footer instead.
 *
 * @returns The education form section.
 */
export default function EducationFields({
  degreeOptions,
  education,
  inputClassName,
  majorOptions,
  onAddEducation,
  onChange,
  onDiplomaUpload,
  onRemoveEducation,
  onSendSchoolEmailVerification,
  schoolOptions,
  sendingSchoolEmailIndex = null,
  showAddEducationButton = true,
  siteName,
  uploadingEducationIndex,
}: EducationFieldsProps) {

  /**
   * Updates the selected degree for one education row.
   *
   * @param index - Education row index, for example `0` for the first row.
   * @param value - Selected degree value, for example `Bachelor's Degree`.
   *
   * @returns Nothing.
   */
  function updateDegree(index: number, value: string) {
    onChange(index, "degree", value);
  }

  return (
    <div className="grid gap-4">
      {/* Render one complete education form row for each item. 
      The index tells parent callbacks which row to update, for example row 0's school. 
      ProctorApplicationClient passes and [...{EMPTY_EDUCATION}] to start with one empty row, 
      and the user can add more rows with the "Add education" button that calls onAddEducation. */}

      {education.map((item, index) => {
        const schoolEmail = item.schoolEmail.trim();
        return (
        <div key={index} className="grid items-start gap-3 border-t border-zinc-100 pt-4 first:border-t-0 first:pt-0 md:grid-cols-4">
          {/* Keep at least one education row on the form; 
          extra rows can be removed when the parent supplies a remover. */}
          {education.length > 1 && onRemoveEducation ? (
            <div className="flex justify-end md:col-span-4">
              <button
                type="button"
                onClick={() => onRemoveEducation(index)}
                className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:border-red-300 hover:text-red-700"
              >
                Remove education
              </button>
            </div>
          ) : null}
          <div className="grid gap-2">
            {/* The degree value belongs to this education row; 
            pass index so the parent updates the correct row. */}
            <select value={item.degree} onChange={(e) => updateDegree(index, e.target.value)} className={inputClassName} required>
              <option value="">Select a degree</option>
              {degreeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          
          {/* Choosing "Other" switches this row from a listed school to a custom school input. */}
          <div className={`grid gap-3 ${item.school === "Other" ? "grid-cols-2 md:col-span-2" : ""}`}>
            {/* The dropdown currently shows whatever is stored in item.school */}
            <select value={item.school} onChange={(e) => onChange(index, "school", e.target.value)} className={inputClassName} required>
              <option value="">Select a school</option>
              {schoolOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            {item.school === "Other" ? (
              <input value={item.customSchool} onChange={(e) => onChange(index, "customSchool", e.target.value)} className={inputClassName} placeholder="Enter school" required />
            ) : null}
          </div>
          {/* Choosing "Other" switches this row from a listed major to a custom major input. */}
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

          <div className="grid content-start gap-2 md:col-span-4">
            <UploadField
              accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
              helperLines={["Accepted formats: PDF, JPG, JPEG, PNG.", "Maximum file size: 5 MB."]}
              inputClassName={inputClassName}
              label="Diploma"
              onFileSelect={(file) => onDiplomaUpload(index, file)}
              filledButtonLabel="Replace"
              // Each education row supports one diploma; the next upload replaces this single URL.
              uploadedFiles={item.diplomaUrl ? [{
                href: diplomaHref(item.diplomaUrl),
                label: "Diploma",
                title: diplomaFileLabel(item.diplomaUrl),
              }] : []}
              uploadingLabel={uploadingEducationIndex === index ? "Uploading diploma..." : null}
            />
          </div>
          <div className="grid content-start gap-2 md:col-span-4">
            <div className="grid gap-2 text-sm font-medium text-zinc-700">
              <span>School email address (optional)</span>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,32rem)_auto_auto] sm:items-center">
                <input
                  type="email"
                  value={item.schoolEmail}
                  onChange={(e) => onChange(index, "schoolEmail", e.target.value)}
                  className={inputClassName}
                  // Optional values may be blank, but any typed school email must be an education address.
                  // Example: `student@ucla.edu` matches this pattern, while `student@gmail.com` does not.
                  pattern={EDUCATION_EMAIL_PATTERN}
                  placeholder="name@school.edu"
                  title="Use a school email address that ends with .edu, for example student@ucla.edu."
                />
                {/* School email verification is optional, so whitespace-only values count as empty.
                    Example: clearing `student@bu.edu` back to `""` hides this verification UI and skips verification validation. */}
                {schoolEmail && onSendSchoolEmailVerification ? (
                  <button
                    type="button"
                    onClick={() => onSendSchoolEmailVerification(index)}
                    disabled={sendingSchoolEmailIndex === index || item.schoolEmailVerificationStatus === "verified"}
                    className="h-full min-h-10 w-fit whitespace-nowrap rounded-2xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sendingSchoolEmailIndex === index
                      ? "Sending..."
                      : item.schoolEmailVerificationStatus === "pending"
                        ? "Resend verification email"
                        : "Send verification email"}
                  </button>
                ) : null}
                {/* Show the latest known verification state for this row, for example "Pending" after sending the email. */}
                {schoolEmail ? (
                  <div className="grid whitespace-nowrap text-xs font-normal text-zinc-500">
                    <span>School email verification status:</span>
                    <span>{schoolEmailStatusLabel(item.schoolEmailVerificationStatus)}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          {/* The applicant must explicitly authorize education and diploma verification before this row is valid. */}
          {/* Example: an unchecked row uses gray emphasis; checking it removes the visible background and border without shifting the layout. */}
          <label
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm md:col-span-4 ${
              item.educationVerificationAuthorized
                ? "border-transparent bg-transparent text-zinc-700"
                : "border-zinc-400 bg-zinc-100 text-zinc-950 shadow-sm"
            }`}
          >
            <input
              type="checkbox"
              checked={item.educationVerificationAuthorized}
              onChange={(e) => onChange(index, "educationVerificationAuthorized", e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-zinc-900"
              required
            />
            <span>I authorize {siteName} to verify this education record and the validity of the uploaded diploma.</span>
          </label>
        </div>
      );
      })}
      {showAddEducationButton ? (
        <button type="button" onClick={onAddEducation} className="w-fit rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium hover:border-zinc-500">
          Add education
        </button>
      ) : null}
    </div>
  );
}
