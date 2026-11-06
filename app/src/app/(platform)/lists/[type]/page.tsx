import { notFound } from "next/navigation";
import { PageHeader, PageShell, Panel } from "@/components/layout/PageShell";
import { OpportunityCard } from "@/components/opportunity/OpportunityCard";
import { listUserOpportunityList } from "@/lib/db/user-workspace";
import { requireFirmPage } from "@/lib/firms/context";

export const dynamic = "force-dynamic";

const META = {
  track: { title: "Track list", description: "Opportunities you are monitoring. Hover a card to favourite, start a pursuit, or remove it." },
  favorite: { title: "Favourites", description: "Opportunities you starred. The assistant prioritises similar opportunities." },
} as const;

export default async function ListPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (type !== "track" && type !== "favorite") notFound();
  const { firm, user } = await requireFirmPage();
  const items = await listUserOpportunityList(firm.id, user.email, type);

  return (
    <PageShell>
      <PageHeader title={META[type].title} description={META[type].description} />
      <Panel title={`${items.length} opportunit${items.length === 1 ? "y" : "ies"}`}>
        <div className="space-y-3">
          {items.map((i) => (
            <OpportunityCard
              key={i.id}
              opp={{
                id: i.opportunity_id,
                title: i.title ?? i.opportunity_id,
                agency_name: i.agency_name,
                response_deadline: i.response_deadline,
                fit_score: i.fit_score,
              }}
            />
          ))}
          {items.length === 0 && (
            <p className="text-sm text-text-muted">
              Nothing here yet — hover any opportunity card and choose {type === "track" ? "Track" : "Favourite"}.
            </p>
          )}
        </div>
      </Panel>
    </PageShell>
  );
}
