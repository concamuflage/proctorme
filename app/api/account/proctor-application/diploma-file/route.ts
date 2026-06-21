import { NextResponse } from "next/server";
import { downloadPrivateObject, isGcsUri, parseGcsUri } from "@/lib/server/gcsUploads";
import { resolveSessionUserId } from "@/lib/server/sessionUser";

export const runtime = "nodejs";

/**
 * Handles GET requests for the /api/account/proctor-application/diploma-file route.
 * The route verifies that the GCS object belongs to the signed-in user and
 * streams the file inline, for example `gcs://bucket/proctor-applications/206/diplomas/file.pdf`.
 *
 * @param request - Request with a `url` query parameter containing the private diploma GCS URI.
 *
 * @returns An inline file response, or a JSON error when the file is missing or unauthorized.
 */
export async function GET(request: Request) {
  const userId = await resolveSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url") || "";
  if (url.startsWith("/uploads/")) {
    return NextResponse.redirect(new URL(url, request.url));
  }

  if (!isGcsUri(url)) {
    return NextResponse.json({ error: "Diploma file not found." }, { status: 404 });
  }

  const parsed = parseGcsUri(url);
  if (!parsed.objectName.startsWith(`proctor-applications/${userId}/diplomas/`)) {
    return NextResponse.json({ error: "Diploma file not found." }, { status: 404 });
  }

  const file = await downloadPrivateObject(url);
  if (!file) {
    return NextResponse.json({ error: "Diploma file not found." }, { status: 404 });
  }

  const filename = file.objectName.split("/").pop() || "diploma";
  return new NextResponse(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}
