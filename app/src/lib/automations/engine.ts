/**
 * Automation agents: watch the opportunity pool (or a user's pursuits) for
 * matches, optionally triage them with the LLM using the firm profile, the
 * owner's custom instructions and persistent memories, then take actions —
 * notify connectors, add to track list / pursuits, put deadlines on calendars,
 * draft documents, call MCP tools, and remember what happened.
 */
import { generateProposalDocument } from "@/lib/ai/generate-document";
import { llmComplete } from "@/lib/ai/complete";
import { parseJsonFromLlm } from "@/lib/ai/parse-json";
import { parseAutomationConfig, type AutomationConfig } from "@/lib/automations/schema";
import { callMcpTool, createCalendarEvent, sendNotification } from "@/lib/connectors/deliver";
import { sendPlatformEmail } from "@/lib/connectors/deliver";
import { getConnector } from "@/lib/connectors/store";
import type { Json } from "@/lib/db/database.types";
import { freshnessOrFilter } from "@/lib/db/freshness";
import { dbRowToOpportunity, deriveMarketTier } from "@/lib/db/map-opportunity";
import { addPursuit } from "@/lib/db/pursuits";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { addToUserList, getAssistantSettings } from "@/lib/db/user-workspace";
import { getSiteUrl } from "@/lib/env";
import { scopedStates, type LaneId } from "@/lib/firms/lanes";
import { buildFirmSystemPrompt } from "@/lib/firms/prompt";
import { getFirmById, listFirms } from "@/lib/firms/repository";
import type { FirmProfile } from "@/lib/firms/types";
import { logger } from "@/lib/logger";
import { createMemory, formatMemoriesForPrompt, listMemories } from "@/lib/memory/memories";
import type { DocumentType } from "@/shared/document-types";
import type { Opportunity } from "@/shared/types/opportunity";

export interface AutomationRecord {
  id: string;
  firm_id: string;
  user_email: string;
  name: string;
  enabled: boolean;
  description: string | null;
  config: AutomationConfig;
  last_run_at: string | null;
}

export interface Candidate {
  opp: Opportunity;
  fit: number | null;
  goNoGo: string | null;
  rationale: string | null;
  kind: "match" | "deadline";
  summary?: string;
}

export interface ActionResult {
  action: string;
  ok: boolean;
  message: string;
}

export interface RunResult {
  automation_id: string;
  run_id?: string;
  matched: number;
  pending_approval: number;
  actions_ok: number;
  actions_failed: number;
  dry_run: boolean;
  matches: { id: string; title: string; fit: number | null; summary?: string }[];
  log: ActionResult[];
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

export function opportunityLane(opp: Opportunity, homeState: string | null): LaneId {
  if (opp.source === "sam") return "federal";
  if (opp.source === "grants_gov" || opp.source === "sba") return "grants";
  const tier = deriveMarketTier(opp);
  if (homeState && opp.place_of_performance?.state?.toUpperCase() === homeState) return "home";
  return tier === "federal" ? "state" : tier;
}

/** Pure filter used by the engine (and unit tests). */
export function matchesFilters(
  opp: Opportunity,
  fit: number | null,
  goNoGo: string | null,
  config: AutomationConfig,
  firm: Pick<FirmProfile, "homeState" | "targetStates" | "workspace">,
): boolean {
  const f = config.filters;
  const lane = opportunityLane(opp, firm.homeState);
  const laneOk =
    f.lanes.includes(lane) ||
    // A home-state bid also satisfies the generic state/local/education lanes.
    (lane === "home" && f.lanes.some((l) => l === deriveMarketTier(opp)));
  if (!laneOk) return false;

  if (lane !== "federal" && lane !== "grants") {
    const allowed = f.states.length ? f.states : scopedStates(firm);
    const st = opp.place_of_performance?.state?.toUpperCase();
    if (allowed !== null && (!st || !allowed.includes(st))) return false;
  }
  if (f.naics.length && (!opp.naics || !f.naics.some((n) => opp.naics!.startsWith(n)))) return false;
  if ((fit ?? 0) < f.minFitScore) return false;
  if (f.goNoGo.length && goNoGo && !f.goNoGo.includes(goNoGo as "go")) return false;
  if (f.noticeTypes.length && !f.noticeTypes.includes(opp.notice_type as "solicitation")) return false;

  const text = `${opp.title} ${opp.description ?? ""}`.toLowerCase();
  if (f.keywords.length && !f.keywords.some((k) => text.includes(k.toLowerCase()))) return false;
  const agency = (opp.agency_name ?? "").toLowerCase();
  if (f.agencies.length && !f.agencies.some((a) => agency.includes(a.toLowerCase()))) return false;
  const setAside = (opp.set_aside ?? "").toLowerCase();
  if (f.setAsides.length && !f.setAsides.some((s) => setAside.includes(s.toLowerCase()))) return false;
  return true;
}

async function alreadyHandled(automationId: string, ids: string[], kind: "match" | "deadline") {
  if (ids.length === 0) return new Set<string>();
  const { data } = await getSupabaseAdmin()
    .from("automation_events")
    .select("opportunity_id")
    .eq("automation_id", automationId)
    .eq("kind", kind)
    .in("opportunity_id", ids);
  return new Set((data ?? []).map((r) => r.opportunity_id));
}

async function newOpportunityCandidates(a: AutomationRecord, firm: FirmProfile): Promise<Candidate[]> {
  const supabase = getSupabaseAdmin();
  const { data: scores, error } = await supabase
    .from("opportunity_scores")
    .select("opportunity_id, fit_score, go_no_go, rationale")
    .eq("firm_id", firm.id)
    .gte("fit_score", a.config.filters.minFitScore)
    .order("fit_score", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  if (!scores?.length) return [];

  const ids = scores.map((s) => s.opportunity_id);
  const handled = await alreadyHandled(a.id, ids, "match");
  const fresh = ids.filter((id) => !handled.has(id));
  if (fresh.length === 0) return [];

  const rows: Opportunity[] = [];
  for (let i = 0; i < fresh.length; i += 150) {
    const { data } = await supabase
      .from("opportunities")
      .select("*")
      .eq("status", "active")
      .or(freshnessOrFilter())
      .in("id", fresh.slice(i, i + 150));
    rows.push(...(data ?? []).map(dbRowToOpportunity));
  }
  const byId = new Map(scores.map((s) => [s.opportunity_id, s]));
  const now = Date.now();

  return rows
    .filter((opp) => !opp.response_deadline || new Date(opp.response_deadline).getTime() > now)
    .map((opp) => {
      const s = byId.get(opp.id)!;
      return { opp, fit: Number(s.fit_score), goNoGo: s.go_no_go, rationale: s.rationale, kind: "match" as const };
    })
    .filter((c) => matchesFilters(c.opp, c.fit, c.goNoGo, a.config, firm))
    .sort((x, y) => (y.fit ?? 0) - (x.fit ?? 0))
    .slice(0, a.config.maxPerRun);
}

async function deadlineCandidates(a: AutomationRecord, firm: FirmProfile): Promise<Candidate[]> {
  const supabase = getSupabaseAdmin();
  const ids = new Set<string>();
  if (a.config.deadlineScope !== "track") {
    const { data } = await supabase
      .from("watchlists")
      .select("opportunity_id, pursuit_stage")
      .eq("firm_id", firm.id)
      .eq("user_email", a.user_email)
      .not("pursuit_stage", "in", "(submitted,won,lost)");
    for (const r of data ?? []) ids.add(r.opportunity_id);
  }
  if (a.config.deadlineScope !== "pursuits") {
    const { data } = await supabase
      .from("user_opportunity_lists")
      .select("opportunity_id")
      .eq("firm_id", firm.id)
      .eq("user_email", a.user_email)
      .eq("list_type", "track");
    for (const r of data ?? []) ids.add(r.opportunity_id);
  }
  if (ids.size === 0) return [];

  const now = new Date();
  const until = new Date(now.getTime() + a.config.deadlineDays * 86_400_000);
  const { data: rows } = await supabase
    .from("opportunities")
    .select("*")
    .in("id", [...ids])
    .gte("response_deadline", now.toISOString())
    .lte("response_deadline", until.toISOString());
  const opps = (rows ?? []).map(dbRowToOpportunity);
  const handled = await alreadyHandled(a.id, opps.map((o) => o.id), "deadline");
  const { data: scores } = await supabase
    .from("opportunity_scores")
    .select("opportunity_id, fit_score, go_no_go, rationale")
    .eq("firm_id", firm.id)
    .in("opportunity_id", opps.map((o) => o.id));
  const byId = new Map((scores ?? []).map((s) => [s.opportunity_id, s]));
  return opps
    .filter((o) => !handled.has(o.id))
    .map((opp) => ({
      opp,
      fit: byId.get(opp.id) ? Number(byId.get(opp.id)!.fit_score) : null,
      goNoGo: byId.get(opp.id)?.go_no_go ?? null,
      rationale: byId.get(opp.id)?.rationale ?? null,
      kind: "deadline" as const,
    }))
    .sort((x, y) => (x.opp.response_deadline ?? "").localeCompare(y.opp.response_deadline ?? ""))
    .slice(0, a.config.maxPerRun);
}

// ---------------------------------------------------------------------------
// AI triage
// ---------------------------------------------------------------------------

async function triage(a: AutomationRecord, firm: FirmProfile, candidates: Candidate[]) {
  if (!a.config.aiTriage || candidates.length === 0) return;
  try {
    const [settings, memories] = await Promise.all([
      getAssistantSettings(firm.id, a.user_email).catch(() => null),
      listMemories({ firmId: firm.id, userEmail: a.user_email }, 60).catch(() => []),
    ]);
    const prompt = [
      `You are "${a.name}", an autonomous capture-monitoring agent for ${firm.legalName}.`,
      a.description ? `Agent purpose: ${a.description}` : "",
      settings?.custom_instructions ? `Operator instructions for agents (follow them):\n${settings.custom_instructions}` : "",
      memories.length ? `What you know about this team's workflows, tasks and guidelines:\n${formatMemoriesForPrompt(memories, 2500)}` : "",
      a.config.trigger === "deadline_approaching"
        ? "These tracked opportunities have deadlines approaching. For each, say what must happen before the deadline."
        : "These opportunities matched the agent's filters. For each, give a crisp bid/no-bid read and the next action.",
      'Return ONLY JSON: {"items":[{"id":"<id>","summary":"<= 2 sentences"}]}',
      JSON.stringify(
        candidates.map((c) => ({
          id: c.opp.id,
          title: c.opp.title,
          agency: c.opp.agency_name,
          naics: c.opp.naics,
          set_aside: c.opp.set_aside,
          deadline: c.opp.response_deadline,
          fit: c.fit,
          rule_rationale: c.rationale?.slice(0, 300),
          description: c.opp.description?.slice(0, 600),
        })),
      ),
    ]
      .filter(Boolean)
      .join("\n\n");
    const { text } = await llmComplete({ system: buildFirmSystemPrompt(firm), userPrompt: prompt, maxTokens: 1500 });
    const parsed = parseJsonFromLlm(text);
    const items = Array.isArray(parsed.items) ? (parsed.items as { id?: string; summary?: string }[]) : [];
    for (const item of items) {
      const c = candidates.find((x) => x.opp.id === item.id);
      if (c && item.summary) c.summary = String(item.summary).slice(0, 600);
    }
  } catch (error) {
    logger.warn("automation.triage_failed", { automation: a.id, error: error instanceof Error ? error.message : String(error) });
  }
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function oppUrl(id: string) {
  return `${getSiteUrl()}/opportunities/${encodeURIComponent(id)}`;
}

function fmtDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBD";
}

export function renderTemplate(value: unknown, c: Candidate): unknown {
  if (typeof value === "string") {
    const vars: Record<string, string> = {
      id: c.opp.id,
      title: c.opp.title,
      agency: c.opp.agency_name ?? "",
      deadline: c.opp.response_deadline ?? "",
      fit: c.fit != null ? String(c.fit) : "",
      url: oppUrl(c.opp.id),
      summary: c.summary ?? c.rationale ?? "",
      naics: c.opp.naics ?? "",
    };
    return value.replace(/\{\{(\w+)\}\}/g, (m, k: string) => vars[k] ?? m);
  }
  if (Array.isArray(value)) return value.map((v) => renderTemplate(v, c));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, renderTemplate(v, c)]));
  }
  return value;
}

function digestText(a: AutomationRecord, cs: Candidate[]) {
  const lines = cs.map((c, i) =>
    [
      `${i + 1}. ${c.opp.title}`,
      `   ${c.opp.agency_name ?? "Agency TBD"} · Fit ${c.fit ?? "—"} · Due ${fmtDate(c.opp.response_deadline)}`,
      c.summary ? `   ${c.summary}` : c.rationale ? `   ${c.rationale.slice(0, 200)}` : "",
      `   ${oppUrl(c.opp.id)}`,
    ]
      .filter(Boolean)
      .join("\n"),
  );
  const head =
    a.config.trigger === "deadline_approaching"
      ? `${cs.length} tracked deadline(s) within ${a.config.deadlineDays} days`
      : `${cs.length} new matching opportunit${cs.length === 1 ? "y" : "ies"}`;
  return { subject: `${a.name}: ${head}`, text: `${head}.\n\n${lines.join("\n\n")}` };
}

async function executeBatch(a: AutomationRecord, firm: FirmProfile, cs: Candidate[]): Promise<Map<string, ActionResult[]>> {
  const perOpp = new Map<string, ActionResult[]>(cs.map((c) => [c.opp.id, []]));
  const push = (id: string, r: ActionResult) => perOpp.get(id)!.push(r);
  const pushAll = (r: ActionResult) => cs.forEach((c) => push(c.opp.id, r));
  const act = a.config.actions;
  const { subject, text } = digestText(a, cs);
  const data = {
    automation: { id: a.id, name: a.name, trigger: a.config.trigger },
    firm: { id: firm.id, name: firm.legalName },
    opportunities: cs.map((c) => ({
      id: c.opp.id,
      title: c.opp.title,
      agency: c.opp.agency_name,
      naics: c.opp.naics,
      deadline: c.opp.response_deadline,
      fit_score: c.fit,
      summary: c.summary ?? null,
      url: oppUrl(c.opp.id),
    })),
  };

  if (act.notifyMe) {
    try {
      await sendPlatformEmail([a.user_email], subject, `<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap">${text.replace(/</g, "&lt;")}</pre>`);
      pushAll({ action: "email_me", ok: true, message: `Emailed ${a.user_email}` });
    } catch (e) {
      pushAll({ action: "email_me", ok: false, message: e instanceof Error ? e.message : "Email failed" });
    }
  }

  for (const id of act.connectors) {
    const connector = await getConnector(firm.id, id).catch(() => null);
    if (!connector) {
      pushAll({ action: "notify", ok: false, message: "Connector no longer exists" });
      continue;
    }
    try {
      const msg = await sendNotification(connector, { subject, text, data, to: connector.type === "email" ? undefined : [a.user_email] });
      pushAll({ action: `notify:${connector.type}`, ok: true, message: msg });
    } catch (e) {
      pushAll({ action: `notify:${connector.type}`, ok: false, message: e instanceof Error ? e.message : "Failed" });
    }
  }

  let drafts = 0;
  for (const c of cs) {
    if (act.addToTrack) {
      await addToUserList(firm.id, a.user_email, c.opp.id, "track")
        .then(() => push(c.opp.id, { action: "track", ok: true, message: "Added to track list" }))
        .catch((e) => push(c.opp.id, { action: "track", ok: false, message: String(e?.message ?? e) }));
    }
    if (act.addToPursuits) {
      await addPursuit(firm.id, a.user_email, c.opp.id, `Added by automation "${a.name}"`)
        .then(() => push(c.opp.id, { action: "pursuit", ok: true, message: "Added to pursuits" }))
        .catch((e) => push(c.opp.id, { action: "pursuit", ok: false, message: String(e?.message ?? e) }));
    }
    for (const id of act.calendarConnectors) {
      if (!c.opp.response_deadline) continue;
      const connector = await getConnector(firm.id, id).catch(() => null);
      if (!connector) continue;
      await createCalendarEvent(connector, {
        title: `Response due: ${c.opp.title}`,
        description: `${c.opp.agency_name ?? ""}\n${c.summary ?? ""}`,
        date: c.opp.response_deadline,
        url: oppUrl(c.opp.id),
      })
        .then((m) => push(c.opp.id, { action: "calendar", ok: true, message: m }))
        .catch((e) => push(c.opp.id, { action: "calendar", ok: false, message: String(e?.message ?? e) }));
    }
    if (act.draftDocument && drafts < 2) {
      drafts += 1;
      await generateProposalDocument({
        opp: c.opp,
        firm,
        documentType: act.draftDocument as DocumentType,
        userEmail: a.user_email,
        analysisSummary: c.summary,
      })
        .then(({ document }) => push(c.opp.id, { action: "draft", ok: true, message: `Drafted "${document.title}"` }))
        .catch((e) => push(c.opp.id, { action: "draft", ok: false, message: String(e?.message ?? e) }));
    }
    if (act.mcp) {
      const connector = await getConnector(firm.id, act.mcp.connectorId).catch(() => null);
      if (connector) {
        await callMcpTool(connector, act.mcp.tool, renderTemplate(act.mcp.args, c) as Record<string, unknown>)
          .then((out) => push(c.opp.id, { action: `mcp:${act.mcp!.tool}`, ok: true, message: out.slice(0, 300) }))
          .catch((e) => push(c.opp.id, { action: `mcp:${act.mcp!.tool}`, ok: false, message: String(e?.message ?? e) }));
      }
    }
  }

  // One memory per run (not per match) so memory stays readable.
  if (act.remember && cs.length) {
    const when = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const items = cs
      .slice(0, 6)
      .map((c) => `"${c.opp.title.slice(0, 90)}" (${c.opp.agency_name ?? "agency TBD"}, fit ${c.fit ?? "—"}, due ${fmtDate(c.opp.response_deadline)})`)
      .join("; ");
    const content =
      cs[0].kind === "deadline"
        ? `${when}: automation "${a.name}" flagged upcoming deadlines — ${items}.`
        : `${when}: automation "${a.name}" surfaced ${cs.length} opportunit${cs.length === 1 ? "y" : "ies"} — ${items}.`;
    await createMemory(
      { firmId: firm.id, userEmail: a.user_email },
      { category: "opportunity", source: "automation", content: content.slice(0, 1900), opportunityId: cs.length === 1 ? cs[0].opp.id : null },
    ).catch(() => undefined);
  }
  return perOpp;
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

function rowToAutomation(row: {
  id: string;
  firm_id: string;
  user_email: string;
  name: string;
  enabled: boolean;
  description: string | null;
  config: Json;
  last_run_at: string | null;
}): AutomationRecord {
  return { ...row, config: parseAutomationConfig(row.config) };
}

export async function getAutomation(firmId: string, id: string): Promise<AutomationRecord | null> {
  const { data } = await getSupabaseAdmin()
    .from("user_automations")
    .select("*")
    .eq("firm_id", firmId)
    .eq("id", id)
    .maybeSingle();
  return data ? rowToAutomation(data) : null;
}

export async function runAutomation(
  a: AutomationRecord,
  options: { trigger?: string; dryRun?: boolean; firm?: FirmProfile } = {},
): Promise<RunResult> {
  const firm = options.firm ?? (await getFirmById(a.firm_id));
  if (!firm) throw new Error("Firm not found");
  const dryRun = Boolean(options.dryRun);
  const supabase = getSupabaseAdmin();

  const candidates =
    a.config.trigger === "deadline_approaching" ? await deadlineCandidates(a, firm) : await newOpportunityCandidates(a, firm);
  await triage(a, firm, candidates);

  const result: RunResult = {
    automation_id: a.id,
    matched: candidates.length,
    pending_approval: 0,
    actions_ok: 0,
    actions_failed: 0,
    dry_run: dryRun,
    matches: candidates.map((c) => ({ id: c.opp.id, title: c.opp.title, fit: c.fit, summary: c.summary })),
    log: [],
  };
  if (dryRun) return result;

  const { data: run } = await supabase
    .from("automation_runs")
    .insert({ automation_id: a.id, firm_id: firm.id, trigger: options.trigger ?? "schedule" })
    .select("id")
    .single();
  result.run_id = run?.id;

  try {
    let toExecute = candidates;
    if (a.config.requireApproval && candidates.length) {
      await supabase.from("automation_events").upsert(
        candidates.map((c) => ({
          automation_id: a.id,
          firm_id: firm.id,
          opportunity_id: c.opp.id,
          kind: c.kind,
          status: "pending_approval",
          fit_score: c.fit,
          ai_summary: c.summary ?? null,
        })),
        { onConflict: "automation_id,opportunity_id,kind", ignoreDuplicates: true },
      );
      result.pending_approval = candidates.length;
      toExecute = [];
      if (a.config.actions.notifyMe) {
        await sendPlatformEmail(
          [a.user_email],
          `${a.name}: ${candidates.length} item(s) awaiting your approval`,
          `<p>${candidates.length} opportunit${candidates.length === 1 ? "y is" : "ies are"} waiting for approval in Smart Capture.</p><p><a href="${getSiteUrl()}/automations">Review in Automations →</a></p>`,
        ).catch(() => undefined);
      }
    }

    if (toExecute.length) {
      const perOpp = await executeBatch(a, firm, toExecute);
      const events = toExecute.map((c) => {
        const results = perOpp.get(c.opp.id) ?? [];
        result.log.push(...results);
        const failed = results.some((r) => !r.ok);
        return {
          automation_id: a.id,
          firm_id: firm.id,
          opportunity_id: c.opp.id,
          kind: c.kind,
          status: failed && results.every((r) => !r.ok) ? "failed" : "done",
          fit_score: c.fit,
          ai_summary: c.summary ?? null,
          results: results as unknown as Json,
          resolved_at: new Date().toISOString(),
        };
      });
      await supabase
        .from("automation_events")
        .upsert(events, { onConflict: "automation_id,opportunity_id,kind", ignoreDuplicates: true });
    }

    result.actions_ok = result.log.filter((r) => r.ok).length;
    result.actions_failed = result.log.filter((r) => !r.ok).length;
    const status = result.actions_failed && !result.actions_ok ? "failed" : result.actions_failed ? "partial" : "success";
    const summary = `${result.matched} matched${result.pending_approval ? `, ${result.pending_approval} awaiting approval` : ""}${result.log.length ? `, ${result.actions_ok}/${result.log.length} actions ok` : ""}`;

    if (run?.id) {
      await supabase
        .from("automation_runs")
        .update({
          status,
          matched: result.matched,
          actions_ok: result.actions_ok,
          actions_failed: result.actions_failed,
          log: result.log.slice(0, 200) as unknown as Json,
          finished_at: new Date().toISOString(),
        })
        .eq("id", run.id);
    }
    await supabase
      .from("user_automations")
      .update({ last_run_at: new Date().toISOString(), last_run_status: status, last_run_summary: summary })
      .eq("id", a.id);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Automation failed";
    if (run?.id) {
      await supabase
        .from("automation_runs")
        .update({ status: "failed", log: [{ action: "run", ok: false, message }] as unknown as Json, finished_at: new Date().toISOString() })
        .eq("id", run.id);
    }
    await supabase
      .from("user_automations")
      .update({ last_run_at: new Date().toISOString(), last_run_status: "failed", last_run_summary: message.slice(0, 300) })
      .eq("id", a.id);
    throw error;
  }
}

/** Approve a pending event: run the automation's actions for that one opportunity. */
export async function resolveEvent(firmId: string, eventId: string, decision: "approve" | "dismiss") {
  const supabase = getSupabaseAdmin();
  const { data: event } = await supabase
    .from("automation_events")
    .select("*")
    .eq("firm_id", firmId)
    .eq("id", eventId)
    .maybeSingle();
  if (!event) throw new Error("Event not found");
  if (event.status !== "pending_approval") throw new Error("Event is not awaiting approval");

  if (decision === "dismiss") {
    await supabase.from("automation_events").update({ status: "dismissed", resolved_at: new Date().toISOString() }).eq("id", eventId);
    return { status: "dismissed", results: [] as ActionResult[] };
  }

  const a = await getAutomation(firmId, event.automation_id);
  const firm = await getFirmById(firmId);
  const { data: oppRow } = await supabase.from("opportunities").select("*").eq("id", event.opportunity_id).maybeSingle();
  if (!a || !firm || !oppRow) throw new Error("Automation or opportunity no longer exists");

  const candidate: Candidate = {
    opp: dbRowToOpportunity(oppRow),
    fit: event.fit_score != null ? Number(event.fit_score) : null,
    goNoGo: null,
    rationale: null,
    kind: event.kind as Candidate["kind"],
    summary: event.ai_summary ?? undefined,
  };
  const results = (await executeBatch(a, firm, [candidate])).get(candidate.opp.id) ?? [];
  const status = results.length && results.every((r) => !r.ok) ? "failed" : "done";
  await supabase
    .from("automation_events")
    .update({ status, results: results as unknown as Json, resolved_at: new Date().toISOString() })
    .eq("id", eventId);
  return { status, results };
}

function isDue(a: AutomationRecord, now: number) {
  if (!a.last_run_at) return true;
  const since = now - new Date(a.last_run_at).getTime();
  return a.config.schedule === "hourly" ? since >= 50 * 60_000 : since >= 20 * 3_600_000;
}

/** Run every enabled automation that is due (called by cron). */
export async function runDueAutomations(options: { force?: boolean; firmId?: string } = {}) {
  const supabase = getSupabaseAdmin();
  let q = supabase.from("user_automations").select("*").eq("enabled", true);
  if (options.firmId) q = q.eq("firm_id", options.firmId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const firms = new Map((await listFirms({ activeOnly: true })).map((f) => [f.id, f]));
  const now = Date.now();
  const out: { automation: string; firm: string; ok: boolean; matched?: number; error?: string }[] = [];
  for (const row of data ?? []) {
    const a = rowToAutomation(row);
    const firm = firms.get(a.firm_id);
    if (!firm || (!options.force && !isDue(a, now))) continue;
    try {
      const r = await runAutomation(a, { trigger: "schedule", firm });
      out.push({ automation: a.id, firm: firm.slug, ok: true, matched: r.matched });
    } catch (e) {
      out.push({ automation: a.id, firm: firm.slug, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return out;
}
