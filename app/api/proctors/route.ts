import { NextResponse } from "next/server";
import { listProctors } from "@/lib/server/proctorStore";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const proctors = await listProctors({ city: searchParams.get("city") });
    return NextResponse.json(proctors);
  } catch (error) {
    console.error("list proctors error:", error);
    return NextResponse.json({ error: "Unable to load proctors." }, { status: 500 });
  }
}
