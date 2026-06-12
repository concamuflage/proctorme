import { NextResponse } from "next/server";
import { checkCredentialsInDb } from "@/lib/server/localAuthStore";

/**
 * Handles POST requests for the /api/auth/login route.
 *
 * @param request - Input used by post.
 *
 * @returns A Next.js response for the request.
 */
export async function POST(request: Request) {
  try {
    const result = await checkCredentialsInDb(
      await request.json().catch(() => null),
    );
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
