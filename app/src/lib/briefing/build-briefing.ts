import { listHotOpportunities } from "@/lib/db/opportunities";
import { getSupabaseAdmin, isDatabaseConfigured } from "@/lib/db/supabase-admin";
import { scoreOpportunity } from "@/lib/scoring/score-opportunity";

export interface BriefingEntry {
  id: string;
  timestamp: string;
  headline: string;
  body: string;
  category: "market" | "deadline" | "hot" | "insight";
  opportunity_id?: string;
  actions: { label: string; href: string }[];
}

export interface DailyBriefingData {
  generated_at: string;
  industry_pulse: string;
  hot_count: number;
  deadline_this_week: number;
  entries: BriefingEntry[];
}

export async function buildDailyBriefing(): Promise<DailyBriefingData> {
  const now = new Date();
  const generatedAt = now.toISOString();

  if (!isDatabaseConfigured()) {
    return {
      generated_at: generatedAt,
      industry_pulse:
        "Connect Supabase and run daily ingest to activate your live industry briefing journal.",
      hot_count: 0,
      deadline_this_week: 0,
      entries: [],
    };
  }

  const supabase = getSupabaseAdmin();
  const hot = await listHotOpportunities(12);

  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const { data: deadlineRows } = await supabase
    .from("opportunities")
    .select("id, title, agency_name, response_deadline, naics, source")
    .eq("status", "active")
    .gte("response_deadline", now.toISOString())
    .lte("response_deadline", weekEnd.toISOString())
    .order("response_deadline", { ascending: true })
    .limit(8);

  const entries: BriefingEntry[] = [];

  entries.push({
    id: "pulse-today",
    timestamp: generatedAt,
    headline: "Industry pulse",
    body: `Federal and SLED markets active for DFEAL. ${hot.length} hot opportunities scored ≥60 with go/review status. Prioritize Illinois home-state and 8(a) set-asides per your capture profile.`,
    category: "market",
    actions: [
      { label: "Explore hot feed", href: "/explore" },
      { label: "Open assistant", href: "/explore" },
    ],
  });

  for (const opp of hot.slice(0, 5)) {
    entries.push({
      id: `hot-${opp.id}`,
      timestamp: generatedAt,
      headline: opp.title,
      body: `${opp.agency_name ?? "Agency TBD"} · Fit ${opp.fit_score ?? scoreOpportunity(opp).fit_score}% · ${opp.go_no_go?.replace("_", " ") ?? "review"}. ${opp.score_rationale ?? "Strong alignment with DFEAL NAICS and certifications."}`,
      category: "hot",
      opportunity_id: opp.id,
      actions: [
        { label: "Open workspace", href: `/opportunities/${opp.id}` },
        { label: "Analyze in chat", href: `/explore?ask=${encodeURIComponent(`Analyze ${opp.title} for DFEAL pursuit fit`)}` },
      ],
    });
  }

  for (const row of deadlineRows ?? []) {
    entries.push({
      id: `deadline-${row.id}`,
      timestamp: row.response_deadline ?? generatedAt,
      headline: `Deadline approaching — ${row.title}`,
      body: `${row.agency_name ?? "Agency TBD"} · Due ${new Date(row.response_deadline!).toLocaleString()}${row.naics ? ` · NAICS ${row.naics}` : ""}`,
      category: "deadline",
      opportunity_id: row.id,
      actions: [
        { label: "View opportunity", href: `/opportunities/${row.id}` },
        { label: "Add to pursuits", href: `/opportunities/${row.id}` },
      ],
    });
  }

  entries.push({
    id: "insight-teaming",
    timestamp: generatedAt,
    headline: "Capture insight",
    body: "Review teaming vendors in your Relevant Vendors section before final go/no-go on federal IT and consulting solicitations. Pair prime/sub strategy with compliance checklist early.",
    category: "insight",
    actions: [{ label: "View vendors", href: "/participants/vendors" }],
  });

  return {
    generated_at: generatedAt,
    industry_pulse: entries[0]?.body ?? "",
    hot_count: hot.length,
    deadline_this_week: deadlineRows?.length ?? 0,
    entries,
  };
}
