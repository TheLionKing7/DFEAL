import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <p className="text-xs font-bold uppercase tracking-widest text-gold">
        Federal · State · Local · Education
      </p>
      <h1 className="mt-4 max-w-2xl text-center text-4xl font-bold">
        Win more contracts with <span className="text-gold">DFEAL AI</span>
      </h1>
      <p className="mt-4 max-w-lg text-center text-text-muted">
        Internal platform for DFEAL LLC — daily hot opportunities, go/no-go
        analysis, proposal generation, and compliance validation.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <Link
          href="/explore"
          className="rounded-lg bg-sidebar px-6 py-3 text-sm font-medium text-white hover:bg-sidebar-surface"
        >
          Enter platform
        </Link>
        <a
          href="../us-contractor-platform/README.md"
          className="rounded-lg border border-border px-6 py-3 text-sm font-medium hover:bg-bg-surface"
        >
          Developer docs
        </a>
      </div>
      <p className="mt-16 text-xs text-text-muted">
        Phase 1 in progress — wire SAM ingest and DFEAL profile to enable live
        data.
      </p>
    </div>
  );
}
