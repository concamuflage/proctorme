import crypto from "crypto";
import path from "path";
import { NextResponse } from "next/server";
import { uploadPrivateObject } from "@/lib/server/gcsUploads";
import { MAX_UPLOAD_FILE_BYTES } from "@/lib/uploadFileSpecs";

type UploadRouteResult =
  | {
      ok: true;
      url: string;
    }
  | {
      ok: false;
      response: NextResponse;
    };

type PrivateUploadRouteOptions = {
  /** MIME types accepted by this route. Example: document uploads accept `application/pdf`, `image/jpeg`, and `image/png`. */
  allowedTypes: ReadonlySet<string>;
  /** Filename extensions accepted by this route. Example: document uploads accept `.pdf`, `.jpg`, `.jpeg`, and `.png`. */
  allowedExtensions: readonly string[];
  /** Error returned when the multipart request does not contain a `file` field. Example: `Diploma file is required.` */
  fileRequiredError: string;
  /** Converts an accepted MIME type to a fallback extension. Example: `image/jpeg` becomes `.jpg` when the original filename has no extension. */
  mimeTypeExtensions: Readonly<Record<string, string>>;
  /** Builds the private GCS object path after validation. Example: `proctor-applications/206/diplomas/1718912345678-a3f91c2d88b4e901.pdf`. */
  objectNameFor: (context: { file: File; filename: string; formData: FormData }) => string;
  /** Error returned when the MIME type is not accepted. Example: `Profile image must be a JPG, PNG, or WebP file.` */
  typeError: string;
  /** Error returned when the file is empty or larger than the shared upload limit. Example: `Government ID file must be 5 MB or smaller.` */
  sizeError: string;
  /** Error returned when the extension cannot be inferred from the filename or MIME type. Example: `Unsupported diploma file type.` */
  unsupportedFileTypeError: string;
};

/**
 * Chooses a safe extension for an already MIME-validated upload.
 *
 * @param file - Browser-provided file from multipart form data, for example `transcript.PDF` with type `application/pdf`.
 * @param allowedExtensions - Lowercase extensions accepted by the route, for example `[".pdf", ".jpg", ".jpeg", ".png"]`.
 * @param mimeTypeExtensions - MIME fallback map, for example `{ "application/pdf": ".pdf", "image/jpeg": ".jpg" }`.
 * @returns The lowercase extension to use in GCS, for example `.pdf`, or an empty string when no accepted extension can be found.
 */
function uploadExtensionFor(file: File, allowedExtensions: readonly string[], mimeTypeExtensions: Readonly<Record<string, string>>) {
  const nameExtension = path.extname(file.name || "").toLowerCase();
  if (allowedExtensions.includes(nameExtension)) return nameExtension;
  return mimeTypeExtensions[file.type] || "";
}

/**
 * Validates one multipart `file` upload and stores it as a private GCS object.
 *
 * @param request - Incoming route request containing multipart form data with a `file` field.
 * @param options - Route-specific validation and object-name rules, for example the diploma route stores files under `proctor-applications/206/diplomas/`.
 * @returns Either the private GCS URL, for example `gcs://bucket/proctor-applications/206/diplomas/file.pdf`, or a ready `NextResponse` error.
 */
export async function uploadMultipartFileToPrivateGcs(request: Request, options: PrivateUploadRouteOptions): Promise<UploadRouteResult> {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(formData instanceof FormData) || !(file instanceof File)) {
    return {
      ok: false,
      response: NextResponse.json({ error: options.fileRequiredError }, { status: 400 }),
    };
  }

  if (!options.allowedTypes.has(file.type)) {
    return {
      ok: false,
      response: NextResponse.json({ error: options.typeError }, { status: 400 }),
    };
  }

  if (file.size <= 0 || file.size > MAX_UPLOAD_FILE_BYTES) {
    return {
      ok: false,
      response: NextResponse.json({ error: options.sizeError }, { status: 400 }),
    };
  }

  const extension = uploadExtensionFor(file, options.allowedExtensions, options.mimeTypeExtensions);
  if (!extension) {
    return {
      ok: false,
      response: NextResponse.json({ error: options.unsupportedFileTypeError }, { status: 400 }),
    };
  }

  // Build a unique object name only after validation passes.
  // Example filename: `1718912345678-a3f91c2d88b4e901.pdf`.
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extension}`;
  const objectName = options.objectNameFor({ file, filename, formData });
  const url = await uploadPrivateObject({
    objectName,
    // Read the uploaded file content into the Buffer expected by the GCS client.
    // Example: a selected `id.pdf` becomes the bytes saved at `proctor-applications/206/government-ids/<filename>.pdf`.
    bytes: Buffer.from(await file.arrayBuffer()),
    contentType: file.type,
  });

  return { ok: true, url };
}
