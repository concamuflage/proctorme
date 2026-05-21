import { NextResponse } from "next/server";
import { getProctorById } from "@/lib/server/proctorStore";

type ProctorRouteContext = {
  params: Promise<{ proctorId: string }>;
};

export async function GET(_request: Request, context: ProctorRouteContext) {
  const { proctorId: proctorIdText } = await context.params;
  const proctorId = Number(proctorIdText);

  if (!Number.isInteger(proctorId) || proctorId <= 0) {
    return NextResponse.json({ error: "Invalid proctor id." }, { status: 400 });
  }

  try {
    const proctor = await getProctorById(proctorId);
    if (!proctor) {
      return NextResponse.json({ error: "Proctor not found." }, { status: 404 });
    }
    return NextResponse.json(proctor);
  } catch (error) {
    console.error("get proctor error:", error);
    return NextResponse.json({ error: "Unable to load proctor." }, { status: 500 });
  }
}

