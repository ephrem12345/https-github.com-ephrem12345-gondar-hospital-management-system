"use client";

import { Suspense, Component, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { ClinicalMessagingHub } from "@/components/messaging/ClinicalMessagingHub";
import { LoadingState } from "@/components/ui/LoadingState";
import { AlertTriangle, RefreshCw } from "lucide-react";

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
        <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-center">
          <div className="max-w-md rounded-2xl bg-white p-6 shadow-md dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400 mb-3">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Clinical Messaging Notice
            </h2>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              A temporary runtime issue occurred while loading clinical messaging. Hospital communications can be reloaded safely.
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry Messaging</span>
            </button>
          </div>
        </div>
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
