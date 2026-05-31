import { NextResponse } from "next/server";
import { getPrivateObjectReadUrl, parseGcsUri } from "@/lib/server/gcsUploads";
import { resolveSessionUserId } from "@/lib/server/sessionUser";

export const runtime = "nodejs";

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

  const parsed = parseGcsUri(url);
  if (!parsed || !parsed.objectName.startsWith(`proctor-applications/${userId}/profile-images/`)) {
    return NextResponse.json({ error: "Profile image not found." }, { status: 404 });
  }

  const signedUrl = await getPrivateObjectReadUrl(url);
  if (!signedUrl) {
    return NextResponse.json({ error: "Profile image not found." }, { status: 404 });
  }

  return NextResponse.redirect(signedUrl);
}
