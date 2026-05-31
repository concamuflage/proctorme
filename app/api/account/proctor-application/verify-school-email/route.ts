import { NextResponse } from "next/server";
import { verifySchoolEmailToken } from "@/lib/server/schoolEmailVerification";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const applicationId = Number(searchParams.get("applicationId"));
  const educationIndex = Number(searchParams.get("educationIndex"));
  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  try {
    const result = await verifySchoolEmailToken({
      applicationId,
      educationIndex,
      email,
      token,
    });

    return NextResponse.json(
      { message: result.message },
      { status: result.ok ? 200 : 400 }
    );
  } catch (error) {
    console.error("school email verification route error:", error);
    return NextResponse.json({ error: "Unable to verify school email." }, { status: 500 });
  }
}
