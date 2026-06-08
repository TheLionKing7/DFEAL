import Link from "next/link";
import { PageHeader, PageShell, Panel } from "@/components/layout/PageShell";
import {
  getVendorBySlug,
  TEAMING_VENDORS,
  type TeamingVendor,
} from "@/config/teaming-vendors";

const JURISDICTION_LABEL: Record<TeamingVendor["jurisdiction"], string> = {
  federal: "Federal",
  state_local: "State & Local",
  grants: "Grants",
};

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ vendor?: string }>;
}) {
  const { vendor: vendorSlug } = await searchParams;
  const selected = vendorSlug ? getVendorBySlug(vendorSlug) : null;

  return (
    <PageShell>
      <PageHeader
        title="Teaming vendors"
        description="Track potential teaming partners and subcontractor relationships for capture."
      />

      {selected ? (
        <Panel className="space-y-4">
          <Link
            href="/participants/vendors"
            className="text-sm font-medium text-gold hover:underline"
          >
            ← All vendors
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              {JURISDICTION_LABEL[selected.jurisdiction]}
            </p>
            <h2 className="mt-1 text-xl font-bold text-text">{selected.name}</h2>
            <p className="mt-2 text-sm text-text-muted">{selected.specialty}</p>
            {selected.location && (
              <p className="mt-1 text-sm text-text-muted">Location: {selected.location}</p>
            )}
            {selected.naics && (
              <p className="mt-1 text-sm text-text-muted">NAICS: {selected.naics}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/entity"
              className="rounded-lg bg-sidebar px-4 py-2 text-sm font-medium text-white hover:bg-sidebar-surface"
            >
              SAM entity lookup
            </Link>
            <Link
              href="/explore"
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-black/[0.03]"
            >
              Back to Explore
            </Link>
          </div>
        </Panel>
      ) : (
        <Panel className="space-y-4">
          <p className="text-sm text-text-muted">
            Select a vendor from Explore or browse the list below. SAM entity lookup is
            available for registration verification.
          </p>
          <ul className="divide-y divide-border">
            {TEAMING_VENDORS.map((v) => (
              <li key={v.slug}>
                <Link
                  href={`/participants/vendors?vendor=${v.slug}`}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 transition hover:text-gold"
                >
                  <span className="font-medium text-text">{v.name}</span>
                  <span className="text-xs text-text-muted">
                    {JURISDICTION_LABEL[v.jurisdiction]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </PageShell>
  );
}
