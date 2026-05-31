import { NextResponse } from "next/server";
import { resolveSessionUserId } from "@/lib/server/sessionUser";
import { listProfileChangeRequestsForUser, submitProfileChangeRequest } from "@/lib/server/profileChangeRequestStore";

export async function GET() {
  const userId = await resolveSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const requests = await listProfileChangeRequestsForUser(userId);
    return NextResponse.json({ requests });
  } catch (error) {
    console.error("account profile change requests list error:", error);
    return NextResponse.json({ error: "Unable to load profile change request history." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await resolveSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const changeType = payload?.changeType;
  if (changeType !== "education") {
    return NextResponse.json({ error: "Unsupported profile change type." }, { status: 400 });
  }

  const newValues = payload?.newValues && typeof payload.newValues === "object" && !Array.isArray(payload.newValues)
    ? payload.newValues
    : {};

  try {
    const requestRecord = await submitProfileChangeRequest(userId, changeType, newValues);
    return NextResponse.json({ request: requestRecord });
  } catch (error) {
    console.error("account profile change request create error:", error);
    const message = error instanceof Error ? error.message : "Unable to submit profile change request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
