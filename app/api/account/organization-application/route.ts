import { NextResponse } from "next/server";
import { resolveSessionUserId } from "@/lib/server/sessionUser";
import { listOrganizationApplicationsForUser, submitOrganizationApplication } from "@/lib/server/organizationApplicationStore";

export async function GET() {
  const userId = await resolveSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const applications = await listOrganizationApplicationsForUser(userId);
    return NextResponse.json({ applications });
  } catch (error) {
    console.error("organization application list error:", error);
    return NextResponse.json({ error: "Unable to load organization applications." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await resolveSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await request.json().catch(() => null);
  try {
    const application = await submitOrganizationApplication(userId, payload);
    return NextResponse.json({ application });
  } catch (error) {
    console.error("organization application submit error:", error);
    const message = error instanceof Error ? error.message : "Unable to submit organization application.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
