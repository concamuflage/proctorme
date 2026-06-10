import { NextResponse } from "next/server";
import { requireAdminUserId } from "@/lib/server/sessionUser";
import { reviewProfileChangeRequest } from "@/lib/server/profileChangeRequestStore";

type RouteContext = {
  params: Promise<{
    requestId: string;
  }>;
};

/**
 * Handles POST requests for the /api/admin/profile-change-requests/:requestId route.
 *
 * @param request - Input used by post.
 * @param context - Input used by post.
 *
 * @returns A Next.js response for the request.
 */
export async function POST(request: Request, context: RouteContext) {
  const adminUserId = await requireAdminUserId();
  if (!adminUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId: requestIdText } = await context.params;
  const requestId = Number(requestIdText);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    return NextResponse.json({ error: "Invalid request id." }, { status: 400 });
  }

  const payload = await request.json().catch(() => null);
  const action = payload?.action;
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Invalid review action." }, { status: 400 });
  }

  try {
    const result = await reviewProfileChangeRequest(
      requestId,
      adminUserId,
      action,
      typeof payload?.note === "string" ? payload.note : ""
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("admin profile change request review error:", error);
    const message = error instanceof Error ? error.message : "Unable to review profile change request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
