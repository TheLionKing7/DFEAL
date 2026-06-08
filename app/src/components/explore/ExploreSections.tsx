import Link from "next/link";
import type { ExploreLane } from "@/lib/db/explore-data";
import type { OpportunityCardData } from "@/components/opportunity/OpportunityCard";
import { OpportunityCard } from "@/components/opportunity/OpportunityCard";
import { SMART_CAPTURE } from "@/config/platform";

export function RecommendedSection({ items }: { items: OpportunityCardData[] }) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-text">Recommended For You</h2>
        <Link href="/opportunities" className="text-sm font-medium text-gold hover:underline">
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

export function PopularSection({ lanes }: { lanes: ExploreLane[] }) {
  const nonEmpty = lanes.filter((l) => l.items.length > 0);
  if (nonEmpty.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
      <div className="px-6 py-6 md:px-8">
        <h2 className="text-xl font-bold">Popular on {SMART_CAPTURE.name}</h2>
        <p className="mt-1 text-sm text-white/85">
          Top contract opportunities by lane — scored for your company profile.
        </p>
      </div>
      <div className="grid gap-px bg-white/20 md:grid-cols-3">
        {nonEmpty.map((lane) => (
          <div key={lane.id} className="bg-white p-5 text-text">
            <h3 className="text-sm font-semibold text-sidebar">{lane.label}</h3>
            <ul className="mt-3 space-y-3">
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
                    {opp.fit_score != null ? ` · Score ${opp.fit_score}` : ""}
                  </p>
                </li>
              ))}
            </ul>
            <Link
              href={`/opportunities?lane=${lane.id === "illinois" ? "illinois" : lane.id}`}
              className="mt-4 inline-block text-xs font-medium text-gold hover:underline"
            >
              See more →
            </Link>
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
            className="rounded-xl border border-dashed border-border bg-bg-surface/60 p-4"
          >
            <span className="rounded bg-sidebar/10 px-2 py-0.5 text-xs font-medium text-sidebar">
              {opp.category_label ?? "Event"}
            </span>
            <h3 className="mt-2 font-medium leading-snug">
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
