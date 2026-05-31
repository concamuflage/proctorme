import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserIdByEmail } from "@/lib/server/profileStore";
import { addUserRole, getUserRoles, type AccountRoleIntent } from "@/lib/server/roleStore";
import { userHasProctorApplication } from "@/lib/server/proctorApplicationStore";

function isRoleIntent(value: unknown): value is AccountRoleIntent {
  return value === "proctor" || value === "corporate";
}

async function resolveSessionUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  if (session.user.id) return Number(session.user.id);
  if (session.user.email) return getUserIdByEmail(session.user.email);
  return null;
}

export async function POST(request: Request) {
  const userId = await resolveSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (!isRoleIntent(payload?.role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  try {
    const role = await addUserRole(userId, payload.role);
    return NextResponse.json({ role });
  } catch (error) {
    console.error("account role add error:", error);
    const message = error instanceof Error ? error.message : "Unable to add role.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const userId = await resolveSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [roles, hasProctorApplication] = await Promise.all([
      getUserRoles(userId),
      userHasProctorApplication(userId),
    ]);
    return NextResponse.json({
      roles,
      hasRoles: roles.length > 0,
      hasProctorApplication,
    });
  } catch (error) {
    console.error("account roles read error:", error);
    return NextResponse.json({ error: "Unable to read roles." }, { status: 500 });
  }
}
