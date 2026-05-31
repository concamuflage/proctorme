import { NextResponse } from "next/server";
import { getPrivateObjectReadUrl, parseGcsUri } from "@/lib/server/gcsUploads";
import { requireAdminUserId } from "@/lib/server/sessionUser";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const adminUserId = await requireAdminUserId();
  if (!adminUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url") || "";
  const parsed = parseGcsUri(url);
  if (!parsed || !parsed.objectName.startsWith("organization-applications/")) {
    return NextResponse.json({ error: "Document file not found." }, { status: 404 });
  }

  const signedUrl = await getPrivateObjectReadUrl(url);
  if (!signedUrl) return NextResponse.json({ error: "Document file not found." }, { status: 404 });

  return NextResponse.redirect(signedUrl);
}
