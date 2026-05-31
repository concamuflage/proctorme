import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getProfile, getUserIdByEmail, updateProfile } from "@/lib/server/profileStore";

async function resolveSessionUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { session, userId: null };
  }

  if (session.user.id) {
    return { session, userId: Number(session.user.id) };
  }

  if (session.user.email) {
    const userId = await getUserIdByEmail(session.user.email);
    return { session, userId };
  }

  return { session, userId: null };
}

export async function GET() {
  const { userId } = await resolveSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const profile = await getProfile(userId);
    return NextResponse.json(profile);
  } catch (error) {
    console.error("profile get error:", error);
    const message = error instanceof Error ? error.message : "Unable to load profile.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { userId } = await resolveSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  try {
    const profile = await updateProfile(userId, payload);
    return NextResponse.json(profile);
  } catch (error) {
    console.error("profile update error:", error);
    const message = error instanceof Error ? error.message : "Unable to update profile.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  return POST(request);
}

export async function DELETE(request: Request) {
  const { userId } = await resolveSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await request.json().catch(() => null);
  return NextResponse.json(
    { error: "Saved customer addresses are no longer supported." },
    { status: 410 }
  );
}
