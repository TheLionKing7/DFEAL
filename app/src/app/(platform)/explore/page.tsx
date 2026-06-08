import { ExploreHero } from "@/components/explore/ExploreHero";
import {
  IndustryEventsSection,
  PopularSection,
  RecommendedSection,
} from "@/components/explore/ExploreSections";
import { PageShell } from "@/components/layout/PageShell";
import { SMART_CAPTURE, TENANT } from "@/config/platform";
import { loadExplorePageData } from "@/lib/db/explore-data";
import { isDatabaseConfigured } from "@/lib/db/supabase-admin";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  let featured: Awaited<ReturnType<typeof loadExplorePageData>>["featured"] = [];
  let recommended: Awaited<ReturnType<typeof loadExplorePageData>>["recommended"] = [];
  let popularLanes: Awaited<ReturnType<typeof loadExplorePageData>>["popularLanes"] = [];
  let industryEvents: Awaited<ReturnType<typeof loadExplorePageData>>["industryEvents"] = [];
  let error: string | null = null;

  if (isDatabaseConfigured()) {
    try {
      const data = await loadExplorePageData();
      featured = data.featured;
      recommended = data.recommended;
      popularLanes = data.popularLanes;
      industryEvents = data.industryEvents;
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load explore feed";
    }
  } else {
    error = "Database not configured — connect Supabase to load opportunities.";
  }

  return (
    <PageShell className="space-y-8">
      <div>
        <p className="text-sm font-medium text-gold">{SMART_CAPTURE.tagline}</p>
        <h1 className="mt-1 text-2xl font-bold text-text">Explore</h1>
        <p className="mt-1 text-sm text-text-muted">
          Contract intelligence for {TENANT.legalName} — powered by {SMART_CAPTURE.name}.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      <ExploreHero items={featured} />

      <RecommendedSection items={recommended} />

      <PopularSection lanes={popularLanes} />

      <IndustryEventsSection items={industryEvents} />
    </PageShell>
  );
}
