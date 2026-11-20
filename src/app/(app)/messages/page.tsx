"use client";

import { Suspense, Component, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { ClinicalMessagingHub } from "@/components/messaging/ClinicalMessagingHub";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class MessagesErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Clinical Messaging ErrorBoundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="mx-auto max-w-lg">
          <ErrorState
            title="Clinical messaging unavailable"
            message="A temporary runtime issue occurred while loading clinical messaging. Hospital communications can be reloaded safely."
            onRetry={() => this.setState({ hasError: false })}
          />
        </Card>
      );
    }
    return this.props.children;
  }
}

function MessagesContent() {
  const searchParams = useSearchParams();
  const patientId = searchParams?.get("patientId") ?? undefined;
  return (
    <MessagesErrorBoundary>
      <ClinicalMessagingHub initialPatientId={patientId} />
    </MessagesErrorBoundary>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<LoadingState variant="page" />}>
      <MessagesContent />
    </Suspense>
  );
}
