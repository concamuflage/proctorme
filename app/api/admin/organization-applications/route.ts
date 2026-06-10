import { NextResponse } from "next/server";
import { requireAdminUserId } from "@/lib/server/sessionUser";
import { listOrganizationApplications } from "@/lib/server/organizationApplicationStore";

/**
 * Handles GET requests for the /api/admin/organization-applications route.
 *
 * @returns A Next.js response for the request.
 */
export async function GET() {
  const adminUserId = await requireAdminUserId();
  if (!adminUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const applications = await listOrganizationApplications();
    return NextResponse.json({ applications });
  } catch (error) {
    console.error("admin organization applications list error:", error);
    return NextResponse.json({ error: "Unable to load organization applications." }, { status: 500 });
  }
}
