import { NextResponse } from "next/server";
import { getPrivateObjectReadUrl, isGcsUri, parseGcsUri } from "@/lib/server/gcsUploads";
import { requireAdminUserId } from "@/lib/server/sessionUser";

export const runtime = "nodejs";

/**
 * Handles GET requests for the /api/admin/proctor-applications/government-id-file route.
 *
 * @param request - Input used by get.
 *
 * @returns A Next.js response for the request.
 */
export async function GET(request: Request) {
  const adminUserId = await requireAdminUserId();
  if (!adminUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url") || "";
  if (url.startsWith("/uploads/")) {
    return NextResponse.redirect(new URL(url, request.url));
  }

  if (!isGcsUri(url)) {
    return NextResponse.json({ error: "Government ID file not found." }, { status: 404 });
  }

  const parsed = parseGcsUri(url);
  const objectPathParts = parsed.objectName.split("/");
  if (
    objectPathParts.length < 4 ||
    objectPathParts[0] !== "proctor-applications" ||
    objectPathParts[1] === "" ||
    objectPathParts[2] !== "government-ids"
  ) {
    return NextResponse.json({ error: "Government ID file not found." }, { status: 404 });
  }

  const signedUrl = await getPrivateObjectReadUrl(url);
  if (!signedUrl) {
    return NextResponse.json({ error: "Government ID file not found." }, { status: 404 });
  }

  return NextResponse.redirect(signedUrl);
}
