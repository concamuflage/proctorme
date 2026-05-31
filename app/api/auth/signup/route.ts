import { NextResponse } from "next/server";
import { signupUser } from "@/lib/server/localAuthStore";

export async function POST(request: Request) {
  try {
    const result = await signupUser(await request.json().catch(() => null));
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("signup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
