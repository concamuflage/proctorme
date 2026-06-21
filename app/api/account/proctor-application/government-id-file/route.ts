import { NextResponse } from "next/server";
import { getPrivateObjectReadUrl, isGcsUri, parseGcsUri } from "@/lib/server/gcsUploads";
import { resolveSessionUserId } from "@/lib/server/sessionUser";

export const runtime = "nodejs";

/**
 * Redirects the signed-in user to a temporary read URL for their uploaded government ID.
 * This route is used to let the signed-in applicant view/open their uploaded government ID during the proctor application flow.
 * 
 * @param request - Request with a `url` query parameter, for example
 * `/api/account/proctor-application/government-id-file?url=gcs%3A%2F%2Fbucket%2Fproctor-applications%2F206%2Fgovernment-ids%2Fid.pdf`.
 *
 * @returns A redirect to a signed GCS URL, or a JSON error such as `{ error: "Government ID file not found." }`.
 */
export async function GET(request: Request) {
  const userId = await resolveSessionUserId();
  // Auth pre-check: a government ID is private account data, so anonymous requests stop here.
  // Example response: `{ error: "Unauthorized" }` with HTTP 401.
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  // Extract the `url` query parameter.
  // example: `url` = `gcs://bucket/proctor-applications/206/government-ids/id.pdf`
  const url = searchParams.get("url") || "";

  // Case 1: malformed or unsupported URL. The current private-file flow expects a GCS URI such as
  // `gcs://bucket/proctor-applications/206/government-ids/id.pdf`; anything else returns the same not-found response.
  if (!isGcsUri(url)) {
    return NextResponse.json({ error: "Invalid file GCSURL." }, { status: 404 });
  }

  const parsed = parseGcsUri(url);

  // Case 2: valid GCS URI, but not this user's government ID folder. This prevents one user from requesting another user's file.
  // Example allowed object path for user 206: `proctor-applications/206/government-ids/id.pdf`.
  if (!parsed.objectName.startsWith(`proctor-applications/${userId}/government-ids/`)) {
    return NextResponse.json({ error: "This file is not yours" }, { status: 404 });
  }

  // Case 3: authorized path, but GCS cannot produce a readable signed URL, for example when the bucket is not allowed or the object is missing.
  // When this succeeds, GCS serves the final file response, while this route controls who receives the short-lived signed URL.
  const signedUrl = await getPrivateObjectReadUrl(url);
  if (!signedUrl) {
    return NextResponse.json({ error: "Government ID file not found." }, { status: 404 });
  }

  return NextResponse.redirect(signedUrl);
}
