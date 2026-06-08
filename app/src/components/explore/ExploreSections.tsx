import Link from "next/link";
import type { ExploreLane } from "@/lib/db/explore-data";
import type { OpportunityCardData } from "@/components/opportunity/OpportunityCard";
import { OpportunityCard } from "@/components/opportunity/OpportunityCard";
import { SMART_CAPTURE } from "@/config/platform";
import { TEAMING_VENDORS } from "@/config/teaming-vendors";

export function RecommendedSection({ items }: { items: OpportunityCardData[] }) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-text">Recommended For You</h2>
        <Link
          href="/opportunities"
          className="text-sm font-medium text-gold hover:underline"
        >
          View all →
        </Link>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {items.map((opp) => (
          <OpportunityCard key={opp.id} opp={opp} />
        ))}
      </div>
    </section>
  );
}

function PopularLaneColumn({ lane }: { lane: ExploreLane }) {
  return (
    <div className="flex min-h-[220px] flex-col bg-white p-5 text-text">
      <h3 className="text-sm font-semibold leading-snug text-sidebar">{lane.label}</h3>
      {lane.items.length > 0 ? (
        <>
          <ul className="mt-3 flex-1 space-y-3">
            {lane.items.map((opp) => (
              <li key={opp.id}>
                <Link
                  href={`/opportunities/${opp.id}`}
                  className="block text-sm font-medium leading-snug hover:text-gold"
                >
                  {opp.title}
                </Link>
                <p className="mt-0.5 text-xs text-text-muted">
                  {opp.agency_name ?? "Agency TBD"}
                  {opp.fit_score != null ? ` · Score ${opp.fit_score}%` : ""}
                </p>
              </li>
            ))}
          </ul>
          <Link
            href={lane.href}
            className="mt-4 inline-block text-xs font-medium text-gold hover:underline"
          >
            See more →
          </Link>
        </>
      ) : (
        <div className="mt-3 flex flex-1 flex-col justify-between">
          <p className="text-sm text-text-muted">
            No opportunities ingested for this lane yet. Run daily ingest or check back
            after the next sync.
          </p>
          <Link
            href={lane.href}
            className="mt-4 inline-block text-xs font-medium text-gold hover:underline"
          >
            Browse lane →
          </Link>
        </div>
      )}
    </div>
  );
}

export function PopularSection({ lanes }: { lanes: ExploreLane[] }) {
  const ordered = ["federal", "state", "grants"]
    .map((id) => lanes.find((l) => l.id === id))
    .filter((l): l is ExploreLane => Boolean(l));

  if (ordered.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-sidebar-surface/40 bg-sidebar shadow-lg">
      <div className="border-b border-white/10 bg-gradient-to-r from-sidebar via-sidebar-surface to-sidebar px-6 py-6 md:px-8">
        <h2 className="text-xl font-bold text-white">
          Popular on {SMART_CAPTURE.name.replace(/\s/g, "")}
        </h2>
        <p className="mt-1 text-sm text-sidebar-muted">
          Top contract opportunities by lane — scored for your company profile.
        </p>
      </div>
      <div className="grid gap-px bg-sidebar-surface/30 md:grid-cols-3">
        {ordered.map((lane) => (
          <PopularLaneColumn key={lane.id} lane={lane} />
        ))}
      </div>
    </section>
  );
}

export function RelevantVendorsSection() {
  const jurisdictions = [
    {
      id: "federal",
      label: "Federal",
      vendors: TEAMING_VENDORS.filter((v) => v.jurisdiction === "federal"),
    },
    {
      id: "state_local",
      label: "State & Local",
      vendors: TEAMING_VENDORS.filter((v) => v.jurisdiction === "state_local"),
    },
    {
      id: "grants",
      label: "Grants",
      vendors: TEAMING_VENDORS.filter((v) => v.jurisdiction === "grants"),
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-text">Relevant Vendors</h2>
          <p className="mt-1 text-sm text-text-muted">
            Teaming partners and subcontractors across your capture jurisdictions.
          </p>
        </div>
        <Link
          href="/participants/vendors"
          className="text-sm font-medium text-gold hover:underline"
        >
          Manage vendors →
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {jurisdictions.map((j) => (
          <div
            key={j.id}
            className="rounded-xl border border-border bg-bg-surface p-5 shadow-sm"
          >
            <h3 className="text-sm font-semibold text-sidebar">{j.label}</h3>
            <ul className="mt-3 space-y-2">
              {j.vendors.map((v) => (
                <li key={v.slug}>
                  <Link
                    href={`/participants/vendors?vendor=${v.slug}`}
                    className="block rounded-lg border border-transparent px-3 py-2.5 transition hover:border-gold/30 hover:bg-black/[0.03] active:bg-black/[0.05]"
                  >
                    <p className="text-sm font-medium text-text group-hover:text-gold">
                      {v.name}
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">{v.specialty}</p>
                    {v.location && (
                      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-text-muted">
                        {v.location}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
              {j.vendors.length === 0 && (
                <li className="text-sm text-text-muted">No vendors configured yet.</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export function IndustryEventsSection({ items }: { items: OpportunityCardData[] }) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-text">Industry Events & Invitations</h2>
        <p className="mt-1 text-sm text-text-muted">
          Informational events and conferences — not scored as contract opportunities.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((opp) => (
          <article
            key={opp.id}
            className="rounded-xl border border-dashed border-border bg-bg-surface p-4"
          >
            <span className="rounded bg-sidebar/10 px-2 py-0.5 text-xs font-medium text-sidebar">
              {opp.category_label ?? "Event"}
            </span>
            <h3 className="mt-2 font-medium leading-snug text-text">
              <Link href={`/opportunities/${opp.id}`} className="hover:text-gold">
                {opp.title}
              </Link>
            </h3>
            <p className="mt-1 text-sm text-text-muted">{opp.agency_name ?? "Agency TBD"}</p>
            {opp.response_deadline && (
              <p className="mt-1 text-xs text-text-muted">
                {new Date(opp.response_deadline).toLocaleDateString()}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
