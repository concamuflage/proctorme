import { NextResponse } from "next/server";
import { getProctorFilterOptions } from "@/lib/server/proctorStore";

/**
 * Handles GET requests for the /api/proctors/filters route.
 *
 * @param request - Input used by get.
 *
 * @returns A Next.js response for the request.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = await getProctorFilterOptions({
      country: searchParams.get("country"),
      state: searchParams.get("state"),
      city: searchParams.get("city"),
      profession: searchParams.get("profession"),
      gender: searchParams.get("gender"),
    });
    return NextResponse.json(filters);
  } catch (error) {
    console.error("get proctor filter options error:", error);
    return NextResponse.json({ error: "Unable to load proctor filters." }, { status: 500 });
  }
}
