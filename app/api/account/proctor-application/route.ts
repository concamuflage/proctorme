import { NextResponse } from "next/server";
import { resolveSessionUserId } from "@/lib/server/sessionUser";
import {
  getProctorApplicationForUser,
  getUserDateOfBirth,
  normalizeProctorApplicationInput,
  saveProctorApplication,
  saveProctorApplicationDraft,
  validateProctorApplicationInput,
} from "@/lib/server/proctorApplicationStore";

export async function GET() {
  const userId = await resolveSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [application, dateOfBirth] = await Promise.all([
      getProctorApplicationForUser(userId),
      getUserDateOfBirth(userId),
    ]);
    return NextResponse.json({ application, dateOfBirth });
  } catch (error) {
    console.error("proctor application get error:", error);
    return NextResponse.json({ error: "Unable to load proctor application." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await resolveSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const input = normalizeProctorApplicationInput(payload);
  const validationError = validateProctorApplicationInput(input);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const application = await saveProctorApplication(userId, input);
    return NextResponse.json({ application });
  } catch (error) {
    console.error("proctor application save error:", error);
    return NextResponse.json({ error: "Unable to submit proctor application." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const userId = await resolveSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const input = normalizeProctorApplicationInput(payload);

  try {
    const application = await saveProctorApplicationDraft(userId, input);
    return NextResponse.json({ application });
  } catch (error) {
    console.error("proctor application draft save error:", error);
    return NextResponse.json({ error: "Unable to save proctor application draft." }, { status: 500 });
  }
}
