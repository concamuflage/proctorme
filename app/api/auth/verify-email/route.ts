import { NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/server/localAuthStore";

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
