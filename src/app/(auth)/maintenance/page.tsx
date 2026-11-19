import { Wrench } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

/** System maintenance notice — rendered while the backend is offline. */
export default function MaintenancePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background-light px-4 dark:bg-background-dark">
      <Card className="w-full max-w-lg">
        <EmptyState
          icon={Wrench}
          title="Scheduled maintenance"
          description="The Gondar Hospital Management System is temporarily unavailable for scheduled maintenance. Clinical services continue on paper during this window. Please try again shortly."
          action={
            <p className="text-xs text-slate-400">
              IT help desk: +251 58 114 0000 · it-support@gondar-hospital.et
            </p>
          }
        />
      </Card>
    </main>
  );
}
