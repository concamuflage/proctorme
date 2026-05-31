import { NextResponse } from "next/server";
import { downloadPrivateObject } from "@/lib/server/gcsUploads";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url") || "";
  if (url.startsWith("/uploads/")) {
    return NextResponse.redirect(new URL(url, request.url));
  }

  const file = await downloadPrivateObject(url);
  if (!file) {
    return NextResponse.json({ error: "Profile image not found." }, { status: 404 });
  }

  const filename = file.objectName.split("/").pop() || "profile-image";
  return new NextResponse(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
