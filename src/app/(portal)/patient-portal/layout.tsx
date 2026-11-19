import type { ReactNode } from "react";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return <PatientPortalLayout>{children}</PatientPortalLayout>;
}
