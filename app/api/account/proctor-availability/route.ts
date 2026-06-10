import { NextResponse } from "next/server";
import { resolveSessionUserId } from "@/lib/server/sessionUser";
import {
  getProctorAvailabilitySettings,
  saveProctorAvailabilitySettings,
} from "@/lib/server/proctorAvailabilityStore";

/**
 * Handles GET requests for the /api/account/proctor-availability route.
 *
 * @returns A Next.js response for the request.
 */
export async function GET() {
  const userId = await resolveSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const availability = await getProctorAvailabilitySettings(userId);
    return NextResponse.json(availability);
  } catch (error) {
    console.error("proctor availability get error:", error);
    return NextResponse.json({ error: "Unable to load proctor availability." }, { status: 500 });
  }
}

/**
 * Handles PUT requests for the /api/account/proctor-availability route.
 *
 * @param request - Input used by put.
 *
 * @returns A Next.js response for the request.
 */
export async function PUT(request: Request) {
  const userId = await resolveSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);

  try {
    const availability = await saveProctorAvailabilitySettings(userId, payload);
    return NextResponse.json(availability);
  } catch (error) {
    console.error("proctor availability save error:", error);
    const message = error instanceof Error ? error.message : "Unable to save proctor availability.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
