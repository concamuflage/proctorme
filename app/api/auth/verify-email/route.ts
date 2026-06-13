import { NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/server/auth/localAuthService";

/**
 * Handles GET requests for the /api/auth/verify-email route.
 *
 * @param request - Input used by get.
 *
 * @returns A Next.js response for the request.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const result = await verifyEmailToken(searchParams.get("email"), searchParams.get("token"));
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("verify email error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
