import { Compass } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound() {
  return (
    <main id="main-content" className="flex min-h-screen items-center justify-center bg-background-light px-4 dark:bg-background-dark">
      <h1 className="sr-only">Page not found</h1>
      <Card className="w-full max-w-lg">
        <EmptyState
          icon={Compass}
          title="404 — Page not found"
          description="The page you requested does not exist or is no longer available. Return to the dashboard to continue."
          action={<Button href="/">Return home</Button>}
        />
      </Card>
    </main>
  );
}
