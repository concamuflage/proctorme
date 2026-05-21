import { NextResponse } from "next/server";
import { getProctorAvailability } from "@/lib/server/proctorStore";

type AvailabilityRouteContext = {
  params: Promise<{ proctorId: string }>;
};

export async function GET(request: Request, context: AvailabilityRouteContext) {
  const { proctorId: proctorIdText } = await context.params;
  const proctorId = Number(proctorIdText);

  if (!Number.isInteger(proctorId) || proctorId <= 0) {
    return NextResponse.json({ error: "Invalid proctor id." }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const days = Number(searchParams.get("days") ?? 7);

  try {
    const availability = await getProctorAvailability(proctorId, {
      start: searchParams.get("start"),
      days: Number.isFinite(days) ? days : 7,
    });
    return NextResponse.json(availability);
  } catch (error) {
    console.error("get proctor availability error:", error);
    return NextResponse.json({ error: "Unable to load availability." }, { status: 500 });
  }
}
