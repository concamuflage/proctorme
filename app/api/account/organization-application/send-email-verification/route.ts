import { NextResponse } from "next/server";
import { resolveSessionUserId } from "@/lib/server/sessionUser";
import { getVerifiedOrganizationEmailStatus, sendOrganizationEmailVerification } from "@/lib/server/organizationEmailVerification";

export async function GET(request: Request) {
  const userId = await resolveSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationEmail = searchParams.get("organizationEmail") || "";
  try {
    const result = await getVerifiedOrganizationEmailStatus(userId, organizationEmail);
    return NextResponse.json(result ?? { status: "not_sent" });
  } catch (error) {
    console.error("organization email verification status error:", error);
    return NextResponse.json({ error: "Unable to read organization email verification status." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await resolveSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await request.json().catch(() => null);
  try {
    const result = await sendOrganizationEmailVerification({
      userId,
      organizationEmail: typeof payload?.organizationEmail === "string" ? payload.organizationEmail : "",
      organizationName: typeof payload?.organizationName === "string" ? payload.organizationName : "",
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("organization email verification send error:", error);
    const message = error instanceof Error ? error.message : "Unable to send organization email verification.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
