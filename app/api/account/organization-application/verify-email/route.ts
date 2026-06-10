import { NextResponse } from "next/server";
import { verifyOrganizationEmailToken } from "@/lib/server/organizationEmailVerification";

/**
 * Handles GET requests for the /api/account/organization-application/verify-email route.
 *
 * @param request - Input used by get.
 *
 * @returns A Next.js response for the request.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  try {
    const result = await verifyOrganizationEmailToken({ email, token });
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: 400 });
    return NextResponse.json({ message: result.message });
  } catch (error) {
    console.error("organization email verification route error:", error);
    return NextResponse.json({ error: "Unable to verify organization email." }, { status: 500 });
  }
}
