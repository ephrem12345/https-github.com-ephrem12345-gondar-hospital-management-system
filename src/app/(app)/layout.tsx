import type { ReactNode } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

/**
 * Authenticated application shell. All module routes render inside this
 * layout; /login sits outside it.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <DashboardLayout>{children}</DashboardLayout>
    </AuthGate>
  );
}
