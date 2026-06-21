"use client";

export type UploadedFileLink = {
  /** URL opened when the uploaded-file chip is clicked, for example `/api/account/proctor-application/diploma-file?url=...`. */
  href: string;
  /** Visible chip text, for example `Diploma` or `Government ID 2`. */
  label: string;
  /** Optional hover title. Example: `Boston University diploma`. */
  title?: string;
};

type UploadFieldProps = {
  /** Native file input accept value. Example: `application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png`. */
  accept: string;
  /** Placeholder shown before any file is uploaded. Example: `No diploma uploaded`. */
  emptyLabel?: string;
  /** Button text after at least one upload exists. Example: `Replace` or `Upload another`. */
  filledButtonLabel?: string;
  /** Helper text lines shown beside the upload box. Example: `["Accepted formats: PDF, JPG, PNG.", "Maximum file size: 5 MB."]`. */
  helperLines?: string[];
  /** Shared input styling from the parent form. Example: `w-full rounded-xl border border-zinc-200 ...`. */
  inputClassName: string;
  /** Field label shown above the control. Example: `Government-issued ID`. */
  label: string;
  /** Callback fired with the selected file, or null if no file is available. Example selected file: `passport.pdf`. */
  onFileSelect: (file: File | null) => void;
  /** Uploaded files rendered as clickable chips. Example: `[{ href: "/api/.../government-id-file?url=...", label: "Government ID" }]`. */
  uploadedFiles: UploadedFileLink[];
  /** Optional in-progress text shown while an upload is running. Example: `Uploading government ID...`. */
  uploadingLabel?: string | null;
};

/**
 * Renders a custom file-upload control that hides browser-controlled file input text.
 *
 * @param props - Upload configuration, for example a single-file `Diploma` field with `filledButtonLabel: "Replace"`.
 *
 * @returns A reusable upload field with uploaded-file links and a hidden native file input.
 */
export default function UploadField({
  accept,
  emptyLabel = "Choose file",
  filledButtonLabel = "Upload another",
  helperLines = [],
  inputClassName,
  label,
  onFileSelect,
  uploadedFiles,
  uploadingLabel = null,
}: UploadFieldProps) {
  const hasUploads = uploadedFiles.length > 0;

  return (
    <div className="grid content-start gap-2">
      <div className="grid gap-2 text-sm font-medium text-zinc-700">
        <span>{label}</span>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,32rem)_auto] sm:items-center">
          <div className={`${inputClassName} grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 overflow-hidden`}>
            <div className="min-w-0">
              {hasUploads ? (
                <div className="flex min-w-0 flex-wrap gap-2 text-xs">
                  {/* if there are uploaded files, display them as clickable chips
                  else, display the empty label */}
                  {uploadedFiles.map((file) => (
                    <a
                      key={file.href}
                      href={file.href}
                      target="_blank"
                      rel="noreferrer"
                      className="max-w-full truncate rounded-full border border-zinc-200 bg-white px-3 py-1 text-zinc-700 underline"
                      title={file.title ?? file.label}
                    >
                      {file.label}
                    </a>
                  ))}
                </div>
              ) : (
                <span className="text-sm font-normal text-zinc-500">{emptyLabel}</span>
              )}
            </div>
            {/* Native file input text is browser-controlled, so the hidden input prevents stale "No file chosen" UI. */}
            <label className="shrink-0 cursor-pointer rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:border-zinc-500">
              {hasUploads ? filledButtonLabel : "Browse"}
              <input
                type="file"
                accept={accept}
                onChange={(event) => {
                  // this is from the parent component
                  // the passed in function mostly uploads the selected file to the gcs, and updates the governmentIdUrls state in the parent component ProctorApplicationClient,
                  onFileSelect(event.target.files?.[0] ?? null);
                  // Clear the file input to allow re-uploading the same file
                  // because the browser will not trigger a change event if the same file is selected again
                  event.target.value = "";
                }}
                className="sr-only"
              />
            </label>
          </div>
          {helperLines.length > 0 ? (
            <div className="grid text-xs font-normal text-zinc-500">
              {helperLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="min-h-8">
        {uploadingLabel ? <div className="text-xs leading-8 text-zinc-500">{uploadingLabel}</div> : null}
      </div>
    </div>
  );
}
