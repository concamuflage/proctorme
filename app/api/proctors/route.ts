import { NextResponse } from "next/server";
import { listProctors } from "@/lib/server/proctorStore";

function parseDateTimeParam(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");

    if ((startParam && !endParam) || (!startParam && endParam)) {
      return NextResponse.json({ error: "Both start and end are required for availability filtering." }, { status: 400 });
    }

    const start = parseDateTimeParam(startParam);
    const end = parseDateTimeParam(endParam);

    if ((startParam && !start) || (endParam && !end)) {
      return NextResponse.json({ error: "Invalid availability time." }, { status: 400 });
    }

    if (start && end && start.getTime() >= end.getTime()) {
      return NextResponse.json({ error: "Availability end time must be after start time." }, { status: 400 });
    }

    const proctors = await listProctors({
      country: searchParams.get("country"),
      state: searchParams.get("state"),
      city: searchParams.get("city"),
      profession: searchParams.get("profession"),
      gender: searchParams.get("gender"),
      minRate: searchParams.get("minRate"),
      maxRate: searchParams.get("maxRate"),
      minRating: searchParams.get("minRating"),
      start: start ? start.toISOString() : null,
      end: end ? end.toISOString() : null,
    });
    return NextResponse.json(proctors);
  } catch (error) {
    console.error("list proctors error:", error);
    return NextResponse.json({ error: "Unable to load proctors." }, { status: 500 });
  }
}
