import { NextResponse } from "next/server";
import { loginUser } from "@/lib/server/localAuthStore";

export async function POST(request: Request) {
  try {
    const result = await loginUser(await request.json().catch(() => null));
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
