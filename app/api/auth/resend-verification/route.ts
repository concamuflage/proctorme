import { NextResponse } from "next/server";
import { resendVerificationEmail } from "@/lib/server/auth/localAuthService";

/**
 * Handles POST requests for the /api/auth/resend-verification route.
 *
 * @param request - Input used by post.
 *
 * @returns A Next.js response for the request.
 */
export async function POST(request: Request) {
  try {
    const result = await resendVerificationEmail(await request.json().catch(() => null));
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("resend verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
