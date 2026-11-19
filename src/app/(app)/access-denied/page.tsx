"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, House, ShieldX } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

/** Shown when the signed-in user lacks permission for an action or area. */
export default function AccessDeniedPage() {
  const router = useRouter();

  return (
    <>
      <PageHeader title="Access denied" />
      <Card>
        <EmptyState
          icon={ShieldX}
          title="You do not have permission to view this area"
          description="This section is restricted to specific roles (for example administrators or department heads). If you believe you should have access, ask your department head or the hospital IT administrator to review your role permissions."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button href="/" leftIcon={<House className="h-4 w-4" aria-hidden />}>
                Return to dashboard
              </Button>
              <Button variant="secondary" onClick={() => router.back()} leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden />}>
                Go back
              </Button>
            </div>
          }
        />
      </Card>
    </>
  );
}
