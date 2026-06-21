import { NextResponse } from "next/server";
import { resolveSessionUserId } from "@/lib/server/sessionUser";
import {
  getSchoolEmailVerificationStatusForUser,
  sendSchoolEmailVerificationForUser,
} from "@/lib/server/proctorApplicationStore";

/**
 * Handles GET requests for the /api/account/proctor-application/send-school-email-verification route.
 *
 * @param request - Request containing `educationIndex` and `schoolEmail`, for example `/api/account/proctor-application/send-school-email-verification?educationIndex=0&schoolEmail=student%40school.edu`.
 *
 * @returns A Next.js response with the current school email verification status.
 */
export async function GET(request: Request) {
  const userId = await resolveSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const educationIndex = Number(searchParams.get("educationIndex"));
  const schoolEmail = searchParams.get("schoolEmail") || "";

  try {
    const result = await getSchoolEmailVerificationStatusForUser(userId, educationIndex, schoolEmail);
    return NextResponse.json(result);
  } catch (error) {
    console.error("school email verification status error:", error);
    return NextResponse.json({ error: "Unable to read school email verification status." }, { status: 500 });
  }
}

/**
 * Handles POST requests for the /api/account/proctor-application/send-school-email-verification route.
 *
 * @param request - Request body containing `educationIndex` and `schoolEmail`, for example `{ "educationIndex": 0, "schoolEmail": "student@school.edu" }`.
 *
 * @returns A Next.js response with the pending or verified school email verification status.
 */
export async function POST(request: Request) {
  const userId = await resolveSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await request.json().catch(() => null);
  const educationIndex = Number(payload?.educationIndex);
  const schoolEmail = typeof payload?.schoolEmail === "string" ? payload.schoolEmail : "";

  try {
    const result = await sendSchoolEmailVerificationForUser({
      userId,
      educationIndex,
      schoolEmail,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("school email verification send error:", error);
    const message = error instanceof Error ? error.message : "Unable to send school email verification.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
