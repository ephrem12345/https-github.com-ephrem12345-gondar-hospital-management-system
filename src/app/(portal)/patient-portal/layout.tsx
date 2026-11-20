import type { ReactNode } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <PatientPortalLayout>{children}</PatientPortalLayout>
    </AuthGate>
  );
}
