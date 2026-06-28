import { redirectToProctorApplicationFile } from "@/lib/server/proctorApplicationFileRoute";

export const runtime = "nodejs";

/**
 * Handles GET requests for the /api/account/proctor-application/profile-image-file route.
 *
 * @param request - Input used by get.
 *
 * @returns A redirect to a temporary GCS read URL, or a JSON error when the file is missing or unauthorized.
 */
export async function GET(request: Request) {
  return redirectToProctorApplicationFile(request, {
    allowLegacyUploads: true,
    folder: "profile-images",
    notFoundError: "Profile image not found.",
  });
}
