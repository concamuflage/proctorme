import { NextResponse } from "next/server";
import { downloadPrivateObject } from "@/lib/server/gcsUploads";
import { requireAdminUserId } from "@/lib/server/sessionUser";

export const runtime = "nodejs";

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
