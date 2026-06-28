import { redirectToProctorApplicationFile } from "@/lib/server/proctorApplicationFileRoute";

export const runtime = "nodejs";

/**
 * Redirects the signed-in user to a temporary read URL for their uploaded government ID.
 * This route is used to let the signed-in applicant view/open their uploaded government ID during the proctor application flow.
 * 
 * @param request - Request with a `url` query parameter, for example
 * `/api/account/proctor-application/government-id-file?url=gcs%3A%2F%2Fbucket%2Fproctor-applications%2F206%2Fgovernment-ids%2Fid.pdf`.
 *
 * @returns A redirect to a temporary GCS read URL, or a JSON error such as `{ error: "Government ID file not found." }`.
 */
export async function GET(request: Request) {
  return redirectToProctorApplicationFile(request, {
    folder: "government-ids",
    invalidUrlError: "Invalid file GCSURL.",
    notFoundError: "Government ID file not found.",
    ownershipError: "This file is not yours",
  });
}
