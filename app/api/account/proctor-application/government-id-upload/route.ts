import crypto from "crypto";
import path from "path";
import { NextResponse } from "next/server";
import { resolveSessionUserId } from "@/lib/server/sessionUser";
import { uploadPrivateObject } from "@/lib/server/gcsUploads";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

export const runtime = "nodejs";

/**
 * Runs the extension for logic for this module.
 *
 * @param file - Input used by extension for.
 *
 * @returns The result used by the surrounding flow.
 */
function extensionFor(file: File) {
  const nameExtension = path.extname(file.name || "").toLowerCase();
  if ([".pdf", ".jpg", ".jpeg", ".png"].includes(nameExtension)) {
    return nameExtension;
  }

  if (file.type === "application/pdf") return ".pdf";
  if (file.type === "image/jpeg") return ".jpg";
  if (file.type === "image/png") return ".png";
  return "";
}

/**
 * Handles POST requests for the /api/account/proctor-application/government-id-upload route.
 *
 * @param request - Input used by post.
 *
 * @returns A Next.js response for the request.
 */
export async function POST(request: Request) {
  const userId = await resolveSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Government ID file is required." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Government ID must be a PDF, JPG, JPEG, or PNG file." }, { status: 400 });
  }

  if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Government ID file must be 5 MB or smaller." }, { status: 400 });
  }

  const extension = extensionFor(file);
  if (!extension) {
    return NextResponse.json({ error: "Unsupported government ID file type." }, { status: 400 });
  }

  const filename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extension}`;
  const objectName = `proctor-applications/${userId}/government-ids/${filename}`;
  const url = await uploadPrivateObject({
    objectName,
    bytes: Buffer.from(await file.arrayBuffer()),
    contentType: file.type,
  });

  return NextResponse.json({ url });
}
