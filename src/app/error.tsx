"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main-content" className="flex min-h-screen items-center justify-center bg-background-light px-4 dark:bg-background-dark">
      <h1 className="sr-only">Something went wrong</h1>
      <Card className="w-full max-w-lg">
        <EmptyState
          icon={AlertCircle}
          title="Something went wrong"
          description="An unexpected error interrupted this page. You can retry or return to the dashboard."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={reset}>Try again</Button>
              <Button href="/" variant="secondary">
                Return home
              </Button>
            </div>
          }
        />
        {error?.digest ? (
          <p className="border-t border-slate-100 px-6 pb-5 text-center text-xs text-slate-400 dark:border-slate-800">
            Error reference: {error.digest}
          </p>
        ) : null}
      </Card>
    </main>
  );
}
