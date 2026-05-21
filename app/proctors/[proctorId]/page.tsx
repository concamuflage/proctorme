import type { Metadata } from "next";
import ProctorDetailClient from "./ProctorDetailClient";
import { SITE_NAME } from "@/lib/proctor";
import { getProctorById } from "@/lib/server/proctorStore";

type ProctorPageProps = {
  params: Promise<{ proctorId: string }>;
};

function pageTitle(title: string) {
  return `${title} | ${SITE_NAME}`;
}

async function getProctorName(slug: string) {
  const proctorId = Number(slug);
  if (!Number.isFinite(proctorId)) {
    return null;
  }

  try {
    const proctor = await getProctorById(proctorId);
    return proctor?.name ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: ProctorPageProps): Promise<Metadata> {
  const { proctorId } = await params;
  const proctorName = await getProctorName(proctorId);

  return {
    title: proctorName ? pageTitle(proctorName) : pageTitle("Proctor"),
  };
}

export default async function ProctorDetailPage({ params }: ProctorPageProps) {
  const { proctorId } = await params;

  return <ProctorDetailClient proctorIdParam={proctorId} />;
}
