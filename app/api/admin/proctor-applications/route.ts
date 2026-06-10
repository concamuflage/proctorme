import { NextResponse } from "next/server";
import { requireAdminUserId } from "@/lib/server/sessionUser";
import { listProctorApplications } from "@/lib/server/proctorApplicationStore";

/**
 * Handles GET requests for the /api/admin/proctor-applications route.
 *
 * @returns A Next.js response for the request.
 */
export async function GET() {
  const adminUserId = await requireAdminUserId();
  if (!adminUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const applications = await listProctorApplications();
    return NextResponse.json({ applications });
  } catch (error) {
    console.error("admin proctor applications list error:", error);
    return NextResponse.json({ error: "Unable to load applications." }, { status: 500 });
  }
}
