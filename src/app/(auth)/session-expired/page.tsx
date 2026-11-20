"use client";

import { Clock, LogIn } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

/** Shown when the session token expires and must be renewed. */
export default function SessionExpiredPage() {
  return (
    <main id="main-content" className="flex min-h-screen items-center justify-center bg-background-light px-4 dark:bg-background-dark">
      <Card className="w-full max-w-lg">
        <EmptyState
          icon={Clock}
          title="Your session has expired"
          description="For patient-data security, hospital sessions end automatically after a period of inactivity. Sign in again to continue where you left off — your work was saved up to the last action."
          action={
            <Button href="/login" leftIcon={<LogIn className="h-4 w-4" aria-hidden />}>
              Sign in again
            </Button>
          }
        />
      </Card>
    </main>
  );
}
