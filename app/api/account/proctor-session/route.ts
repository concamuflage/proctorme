import { NextResponse } from "next/server";
import { resolveSessionUserId } from "@/lib/server/sessionUser";
import {
  getProctorSessionSettings,
  updateProctorSessionSettings,
} from "@/lib/server/proctorSessionStore";

export async function GET() {
  const userId = await resolveSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await getProctorSessionSettings(userId);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("proctor session get error:", error);
    const message = error instanceof Error ? error.message : "Unable to load session settings.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const userId = await resolveSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);

  try {
    const settings = await updateProctorSessionSettings(userId, payload);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("proctor session save error:", error);
    const message = error instanceof Error ? error.message : "Unable to save session settings.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
