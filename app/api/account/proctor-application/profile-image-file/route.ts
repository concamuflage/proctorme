import { NextResponse } from "next/server";
import { getPrivateObjectReadUrl, isGcsUri, parseGcsUri } from "@/lib/server/gcsUploads";
import { resolveSessionUserId } from "@/lib/server/sessionUser";

export const runtime = "nodejs";

/**
 * Handles GET requests for the /api/account/proctor-application/profile-image-file route.
 *
 * @param request - Input used by get.
 *
 * @returns A Next.js response for the request.
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
    return NextResponse.json({ error: "Profile image not found." }, { status: 404 });
  }

  const parsed = parseGcsUri(url);
  if (!parsed.objectName.startsWith(`proctor-applications/${userId}/profile-images/`)) {
    return NextResponse.json({ error: "Profile image not found." }, { status: 404 });
  }

  const signedUrl = await getPrivateObjectReadUrl(url);
  if (!signedUrl) {
    return NextResponse.json({ error: "Profile image not found." }, { status: 404 });
  }

  return NextResponse.redirect(signedUrl);
}
