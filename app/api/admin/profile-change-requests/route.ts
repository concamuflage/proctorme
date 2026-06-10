import { NextResponse } from "next/server";
import { requireAdminUserId } from "@/lib/server/sessionUser";
import { listProfileChangeRequests } from "@/lib/server/profileChangeRequestStore";

/**
 * Handles GET requests for the /api/admin/profile-change-requests route.
 *
 * @returns A Next.js response for the request.
 */
export async function GET() {
  const adminUserId = await requireAdminUserId();
  if (!adminUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const requests = await listProfileChangeRequests();
    return NextResponse.json({ requests });
  } catch (error) {
    console.error("admin profile change requests list error:", error);
    return NextResponse.json({ error: "Unable to load profile change requests." }, { status: 500 });
  }
}
