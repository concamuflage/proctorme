import crypto from "crypto";
import path from "path";
import { NextResponse } from "next/server";
import { resolveSessionUserId } from "@/lib/server/sessionUser";
import { uploadPrivateObject } from "@/lib/server/gcsUploads";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

export const runtime = "nodejs";

function extensionFor(file: File) {
  const nameExtension = path.extname(file.name || "").toLowerCase();
  if ([".pdf", ".jpg", ".jpeg", ".png"].includes(nameExtension)) return nameExtension;
  if (file.type === "application/pdf") return ".pdf";
  if (file.type === "image/jpeg") return ".jpg";
  if (file.type === "image/png") return ".png";
  return "";
}

export async function POST(request: Request) {
  const userId = await resolveSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const documentType = String(formData?.get("documentType") || "");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Document file is required." }, { status: 400 });
  }
  if (documentType !== "business_card" && documentType !== "badge") {
    return NextResponse.json({ error: "Invalid document type." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Document must be a PDF, JPG, JPEG, or PNG file." }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Document file must be 5 MB or smaller." }, { status: 400 });
  }

  const extension = extensionFor(file);
  if (!extension) return NextResponse.json({ error: "Unsupported document file type." }, { status: 400 });

  const filename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extension}`;
  const objectName = `organization-applications/${userId}/${documentType}/${filename}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const url = await uploadPrivateObject({ objectName, bytes, contentType: file.type });

  return NextResponse.json({ url });
}
