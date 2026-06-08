import Link from "next/link";
import { SMART_CAPTURE, TENANT } from "@/config/platform";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <p className="text-xs font-bold uppercase tracking-widest text-gold">
        {SMART_CAPTURE.tagline}
      </p>
      <h1 className="mt-4 max-w-2xl text-center text-4xl font-bold">
        <span className="text-gold">{SMART_CAPTURE.name}</span>
      </h1>
      <p className="mt-4 max-w-lg text-center text-text-muted">
        AI-powered contracting intelligence for {TENANT.legalName} — daily hot
        opportunities, go/no-go analysis, proposal generation, and compliance.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <Link
          href="/explore"
          className="rounded-lg bg-sidebar px-6 py-3 text-sm font-medium text-white hover:bg-sidebar-surface"
        >
          Enter platform
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-border px-6 py-3 text-sm font-medium hover:bg-bg-surface"
        >
          Team sign in
        </Link>
      </div>
      <p className="mt-16 text-xs text-text-muted">
        {SMART_CAPTURE.copyright} ·{" "}
        <a href={SMART_CAPTURE.parentUrl} className="hover:text-gold">
          {SMART_CAPTURE.parentCompany}
        </a>
      </p>
    </div>
  );
}
