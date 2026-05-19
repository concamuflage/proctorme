import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getServerApiBaseUrl } from "@/lib/api-base";
import { deleteCurrentUserAccount } from "@/lib/server/accountStore";
import { getUserIdByEmail } from "@/lib/server/profileStore";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

async function confirmPassword(email: string, password: string) {
  const response = await fetch(`${getServerApiBaseUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  return response.ok;
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const sessionUserId = session?.user?.id ? Number(session.user.id) : null;

  if (!session?.user || !email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const password = typeof payload?.password === "string" ? payload.password : "";
  if (!password) {
    return badRequest("Password confirmation is required.");
  }

  const passwordConfirmed = await confirmPassword(email, password);
  if (!passwordConfirmed) {
    return NextResponse.json({ error: "Password confirmation failed." }, { status: 403 });
  }

  const userId = typeof sessionUserId === "number" && Number.isInteger(sessionUserId) && sessionUserId > 0
    ? sessionUserId
    : await getUserIdByEmail(email);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await deleteCurrentUserAccount(userId);
    return NextResponse.json({
      message: "Account deleted.",
      mode: result.mode,
    });
  } catch (error) {
    console.error("account delete error:", error);
    return NextResponse.json({ error: "Unable to delete account." }, { status: 500 });
  }
}
