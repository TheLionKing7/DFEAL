import type { Opportunity } from "@/shared/types/opportunity";
import { enrichOpportunityDetails } from "@/lib/opportunity/enrich";

export function OpportunityContractStrip({ opportunity }: { opportunity: Opportunity }) {
  const details = enrichOpportunityDetails(opportunity);

  return (
    <div className="rounded-xl border border-border bg-bg-surface px-5 py-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Notice #</p>
          <p className="font-mono font-semibold">{opportunity.external_id}</p>
        </div>
        <span className="rounded-full bg-sidebar/10 px-2.5 py-0.5 text-xs font-medium text-sidebar">
          {details.noticeType ?? opportunity.notice_type}
        </span>
        {opportunity.set_aside && (
          <span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-0.5 text-xs text-gold">
            {opportunity.set_aside}
          </span>
        )}
        <span className="rounded-full border border-border px-2.5 py-0.5 text-xs uppercase text-text-muted">
          {opportunity.source}
        </span>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <Meta label="Agency" value={opportunity.agency_name ?? "TBD"} />
        <Meta label="NAICS" value={opportunity.naics ?? "—"} />
        <Meta label="Posted" value={formatDate(opportunity.posted_date)} />
        <Meta label="Response due" value={formatDate(opportunity.response_deadline)} />
        <Meta label="Place of performance" value={details.placeLabel ?? "—"} />
        <Meta label="Est. value" value={formatValue(opportunity.estimated_value_usd)} />
        <Meta label="PSC" value={opportunity.psc ?? "—"} />
        <Meta label="Department" value={details.department ?? "—"} />
      </dl>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium leading-snug">{value}</dd>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatValue(value: number | null) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
