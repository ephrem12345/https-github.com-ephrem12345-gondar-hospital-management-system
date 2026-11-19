"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, House, UserRoundX } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

/** Signed in, but the account is not authorized for the requested context. */
export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background-light px-4 dark:bg-background-dark">
      <Card className="w-full max-w-lg">
        <EmptyState
          icon={UserRoundX}
          title="401 — Unauthorized"
          description="Your session is not authorized for this request. This can happen when your role permissions changed or the session belongs to a different account. Sign in again or return to the dashboard."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button href="/login">Sign in again</Button>
              <Button href="/" variant="secondary" leftIcon={<House className="h-4 w-4" aria-hidden />}>
                Dashboard
              </Button>
              <Button variant="ghost" onClick={() => router.back()} leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden />}>
                Go back
              </Button>
            </div>
          }
        />
      </Card>
    </main>
  );
}
