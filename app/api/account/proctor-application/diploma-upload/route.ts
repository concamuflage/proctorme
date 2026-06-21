import { NextResponse } from "next/server";
import { resolveSessionUserId } from "@/lib/server/sessionUser";
import { uploadMultipartFileToPrivateGcs } from "@/lib/server/privateUploadRoute";
import { ALLOWED_DOCUMENT_FILE_TYPES } from "@/lib/uploadFileSpecs";

export const runtime = "nodejs";

/**
 * Builds the private GCS object path for a diploma upload.
 *
 * @param userId - Signed-in applicant user ID, for example `206`.
 * @param filename - Generated upload filename, for example `1718912345678-a3f91c2d88b4e901.pdf`.
 *
 * @returns A private object path, for example `proctor-applications/206/diplomas/1718912345678-a3f91c2d88b4e901.pdf`.
 */
function diplomaObjectName(userId: number, filename: string) {
  return `proctor-applications/${userId}/diplomas/${filename}`;
}

/**
 * Handles POST requests for the /api/account/proctor-application/diploma-upload route.
 *
 * @param request - Input used by post.
 *
 * @returns A Next.js response for the request.
 */
export async function POST(request: Request) {
  const userId = await resolveSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const upload = await uploadMultipartFileToPrivateGcs(request, {
    allowedTypes: ALLOWED_DOCUMENT_FILE_TYPES,
    allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png"],
    fileRequiredError: "Diploma file is required.",
    mimeTypeExtensions: {
      "application/pdf": ".pdf",
      "image/jpeg": ".jpg",
      "image/png": ".png",
    },
    objectNameFor: ({ filename }) => diplomaObjectName(userId, filename),
    typeError: "Diploma must be a PDF, JPG, JPEG, or PNG file.",
    sizeError: "Diploma file must be 5 MB or smaller.",
    unsupportedFileTypeError: "Unsupported diploma file type.",
  });
  if (!upload.ok) return upload.response;

  return NextResponse.json({ url: upload.url });
}
