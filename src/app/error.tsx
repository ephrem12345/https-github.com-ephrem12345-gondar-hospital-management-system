"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <h1 className="text-base font-semibold text-slate-800 dark:text-slate-100">Something went wrong</h1>
        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
          An unexpected error interrupted this page. You can retry or return to the dashboard.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={reset} className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700">
            Try again
          </button>
          <a href="/" className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            Return home
          </a>
        </div>
        {error?.digest ? <p className="mt-2 text-xs text-slate-400">Error reference: {error.digest}</p> : null}
      </div>
    </main>
  );
}
