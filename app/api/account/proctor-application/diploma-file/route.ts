import { redirectToProctorApplicationFile } from "@/lib/server/proctorApplicationFileRoute";

export const runtime = "nodejs";

/**
 * Handles GET requests for the /api/account/proctor-application/diploma-file route.
 * The route verifies that the GCS object belongs to the signed-in user and
 * redirects to a temporary signed URL, for example `gcs://bucket/proctor-applications/206/diplomas/file.pdf`.
 *
 * @param request - Request with a `url` query parameter containing the private diploma GCS URI.
 *
 * @returns A redirect to a temporary GCS read URL, or a JSON error when the file is missing or unauthorized.
 */
export async function GET(request: Request) {
  return redirectToProctorApplicationFile(request, {
    allowLegacyUploads: true,
    folder: "diplomas",
    notFoundError: "Diploma file not found.",
  });
}
