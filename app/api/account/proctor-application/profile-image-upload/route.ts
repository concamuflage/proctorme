import crypto from "crypto";
import path from "path";
import { NextResponse } from "next/server";
import { uploadPrivateObject } from "@/lib/server/gcsUploads";
import { resolveSessionUserId } from "@/lib/server/sessionUser";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const runtime = "nodejs";

function extensionFor(file: File) {
  const nameExtension = path.extname(file.name || "").toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp"].includes(nameExtension)) {
    return nameExtension;
  }

  if (file.type === "image/jpeg") return ".jpg";
  if (file.type === "image/png") return ".png";
  if (file.type === "image/webp") return ".webp";
  return "";
}

export async function POST(request: Request) {
  const userId = await resolveSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Profile image file is required." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Profile image must be a JPG, PNG, or WebP file." }, { status: 400 });
  }

  if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Profile image must be 8 MB or smaller." }, { status: 400 });
  }

  const extension = extensionFor(file);
  if (!extension) {
    return NextResponse.json({ error: "Unsupported profile image file type." }, { status: 400 });
  }

  const filename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extension}`;
  const objectName = `proctor-applications/${userId}/profile-images/${filename}`;
  const url = await uploadPrivateObject({
    objectName,
    bytes: Buffer.from(await file.arrayBuffer()),
    contentType: file.type,
  });

  return NextResponse.json({ url });
}
