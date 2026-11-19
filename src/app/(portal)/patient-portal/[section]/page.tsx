import { notFound } from "next/navigation";
import { PatientPortalScreen } from "@/components/portal/PatientPortalScreen";
import type { PatientPortalSection } from "@/services/patient-portal";

const sections: readonly PatientPortalSection[] = [
  "profile",
  "appointments",
  "records",
  "billing",
  "notifications",
  "support",
];

function isPortalSection(section: string): section is PatientPortalSection {
  return sections.some((supportedSection) => supportedSection === section);
}

export default async function PatientPortalSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!isPortalSection(section)) notFound();
  return <PatientPortalScreen section={section} />;
}
