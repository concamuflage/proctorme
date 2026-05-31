import { NextResponse } from "next/server";
import { requireAdminUserId } from "@/lib/server/sessionUser";
import {
  normalizeProctorApplicationInput,
  reviewProctorApplication,
  validateProctorApplicationInput,
} from "@/lib/server/proctorApplicationStore";

type RouteContext = {
  params: Promise<{ applicationId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const adminUserId = await requireAdminUserId();
  if (!adminUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { applicationId } = await context.params;
  const parsedApplicationId = Number(applicationId);
  if (!Number.isInteger(parsedApplicationId) || parsedApplicationId <= 0) {
    return NextResponse.json({ error: "Invalid application id." }, { status: 400 });
  }

  const payload = await request.json().catch(() => null);
  const action = payload?.action === "reject" ? "reject" : payload?.action === "approve" ? "approve" : null;
  if (!action) {
    return NextResponse.json({ error: "Invalid review action." }, { status: 400 });
  }

  const editedApplication = action === "approve" && payload?.application
    ? normalizeProctorApplicationInput(payload.application)
    : null;
  if (editedApplication) {
    const validationError = validateProctorApplicationInput(editedApplication);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
  }

  try {
    const result = await reviewProctorApplication(
      parsedApplicationId,
      adminUserId,
      action,
      typeof payload?.note === "string" ? payload.note : "",
      editedApplication
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("admin proctor application review error:", error);
    const message = error instanceof Error ? error.message : "Unable to review application.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
