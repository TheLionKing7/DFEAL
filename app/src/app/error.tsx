"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 px-6 py-24 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="max-w-md text-sm text-text-muted">
        The error has been logged{error.digest ? ` (ref ${error.digest})` : ""}. Try again, or return to Explore.
      </p>
      <div className="mt-4 flex gap-3">
        <button onClick={reset} className="rounded-lg bg-sidebar px-5 py-2 text-sm text-white hover:bg-sidebar-surface">
          Try again
        </button>
        <a href="/explore" className="rounded-lg border border-border px-5 py-2 text-sm hover:bg-bg-surface">
          Explore
        </a>
      </div>
    </div>
  );
}
