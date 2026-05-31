import { NextResponse } from "next/server";
import { requireAdminUserId } from "@/lib/server/sessionUser";
import { reviewOrganizationApplication } from "@/lib/server/organizationApplicationStore";

export async function POST(request: Request, context: { params: Promise<{ applicationId: string }> }) {
  const adminUserId = await requireAdminUserId();
  if (!adminUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { applicationId } = await context.params;
  const id = Number(applicationId);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid application id." }, { status: 400 });

  const payload = await request.json().catch(() => null);
  const action = payload?.action;
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Invalid review action." }, { status: 400 });
  }

  try {
    await reviewOrganizationApplication(id, adminUserId, action, typeof payload?.note === "string" ? payload.note : "");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("admin organization application review error:", error);
    const message = error instanceof Error ? error.message : "Unable to review organization application.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
