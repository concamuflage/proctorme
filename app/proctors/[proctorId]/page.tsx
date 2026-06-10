import type { Metadata } from "next";
import ProctorDetailClient from "./ProctorDetailClient";
import { SITE_NAME } from "@/lib/proctor";
import { getProctorById } from "@/lib/server/proctorStore";

type ProctorPageProps = {
  params: Promise<{ proctorId: string }>;
};

/**
 * Runs the page title logic for this module.
 *
 * @param title - Input used by page title.
 *
 * @returns The result used by the surrounding flow.
 */
function pageTitle(title: string) {
  return `${title} | ${SITE_NAME}`;
}

/**
 * Gets proctor name for this flow.
 *
 * @param slug - Input used by get proctor name.
 *
 * @returns The result used by the surrounding flow.
 */
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

/**
 * Runs the generate metadata logic for this module.
 *
 * @param params - Input used by generate metadata.
 *
 * @returns The result used by the surrounding flow.
 */
export async function generateMetadata({ params }: ProctorPageProps): Promise<Metadata> {
  const { proctorId } = await params;
  const proctorName = await getProctorName(proctorId);

  return {
    title: proctorName ? pageTitle(proctorName) : pageTitle("Proctor"),
  };
}

/**
 * Renders the /proctors/[proctorId] page.
 *
 * @param params - Input used by proctor detail page.
 *
 * @returns The page UI.
 */
export default async function ProctorDetailPage({ params }: ProctorPageProps) {
  const { proctorId } = await params;

  return <ProctorDetailClient proctorIdParam={proctorId} />;
}
