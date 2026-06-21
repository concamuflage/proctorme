import { NextResponse } from "next/server";
import { uploadMultipartFileToPrivateGcs } from "@/lib/server/privateUploadRoute";
import { resolveSessionUserId } from "@/lib/server/sessionUser";
import { ALLOWED_PROFILE_IMAGE_FILE_TYPES } from "@/lib/uploadFileSpecs";

export const runtime = "nodejs";

/**
 * Builds the private GCS object path for a proctor profile image upload.
 *
 * @param userId - Signed-in applicant user ID, for example `206`.
 * @param filename - Generated upload filename, for example `1718912345678-a3f91c2d88b4e901.webp`.
 *
 * @returns A private object path, for example `proctor-applications/206/profile-images/1718912345678-a3f91c2d88b4e901.webp`.
 */
function profileImageObjectName(userId: number, filename: string) {
  return `proctor-applications/${userId}/profile-images/${filename}`;
}

/**
 * Handles POST requests for the /api/account/proctor-application/profile-image-upload route.
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
    allowedTypes: ALLOWED_PROFILE_IMAGE_FILE_TYPES,
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
    fileRequiredError: "Profile image file is required.",
    mimeTypeExtensions: {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
    },
    objectNameFor: ({ filename }) => profileImageObjectName(userId, filename),
    typeError: "Profile image must be a JPG, PNG, or WebP file.",
    sizeError: "Profile image must be 5 MB or smaller.",
    unsupportedFileTypeError: "Unsupported profile image file type.",
  });
  if (!upload.ok) return upload.response;

  return NextResponse.json({ url: upload.url });
}
