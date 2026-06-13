import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/server/auth/localAuthService";

/**
 * Handles POST requests for the /api/auth/request-password-reset route.
 *
 * @param request - Input used by post.
 *
 * @returns A Next.js response for the request.
 */
export async function POST(request: Request) {
  try {
    const result = await requestPasswordReset(await request.json().catch(() => null));
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("request password reset error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
