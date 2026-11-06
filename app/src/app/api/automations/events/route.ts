import { NextRequest, NextResponse } from "next/server";
import { resolveEvent } from "@/lib/automations/engine";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { requireFirmApi } from "@/lib/firms/context";
import { badRequest, readJson, serverError } from "@/lib/http/json";

export const maxDuration = 120;

/** Recent automation events for the user's automations (approvals inbox + activity). */
export async function GET(request: NextRequest) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;
  const status = request.nextUrl.searchParams.get("status");
  try {
    const supabase = getSupabaseAdmin();
    const { data: autos } = await supabase
      .from("user_automations")
      .select("id, name")
      .eq("firm_id", ctx.firm.id)
      .eq("user_email", ctx.user.email);
    const names = new Map((autos ?? []).map((a) => [a.id, a.name]));
    if (names.size === 0) return NextResponse.json({ events: [], pending: 0 });

    let q = supabase
      .from("automation_events")
      .select("*")
      .eq("firm_id", ctx.firm.id)
      .in("automation_id", [...names.keys()])
      .order("created_at", { ascending: false })
      .limit(60);
    if (status) q = q.eq("status", status);
    const { data: events, error } = await q;
    if (error) throw new Error(error.message);

    const ids = [...new Set((events ?? []).map((e) => e.opportunity_id))];
    const { data: opps } = ids.length
      ? await supabase.from("opportunities").select("id, title, agency_name, response_deadline").in("id", ids)
      : { data: [] as { id: string; title: string; agency_name: string | null; response_deadline: string | null }[] };
    const oppMap = new Map((opps ?? []).map((o) => [o.id, o]));
    const { count } = await supabase
      .from("automation_events")
      .select("id", { count: "exact", head: true })
      .eq("firm_id", ctx.firm.id)
      .in("automation_id", [...names.keys()])
      .eq("status", "pending_approval");

    return NextResponse.json({
      pending: count ?? 0,
      events: (events ?? []).map((e) => ({
        ...e,
        automation_name: names.get(e.automation_id) ?? "Automation",
        opportunity: oppMap.get(e.opportunity_id) ?? null,
      })),
    });
  } catch (error) {
    return serverError("api.automation_events.get_failed", error);
  }
}

/** Approve or dismiss a pending event: `{ id, decision: "approve" | "dismiss" }`. */
export async function POST(request: NextRequest) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;
  const body = await readJson<{ id?: string; decision?: string }>(request);
  if (!body?.id || (body.decision !== "approve" && body.decision !== "dismiss")) {
    return badRequest("id and decision (approve|dismiss) required");
  }
  try {
    const { data: ev } = await getSupabaseAdmin()
      .from("automation_events")
      .select("automation_id")
      .eq("firm_id", ctx.firm.id)
      .eq("id", body.id)
      .maybeSingle();
    const { data: owner } = ev
      ? await getSupabaseAdmin().from("user_automations").select("user_email").eq("id", ev.automation_id).maybeSingle()
      : { data: null };
    if (!owner || owner.user_email !== ctx.user.email) return badRequest("Event not found");
    return NextResponse.json({ ok: true, ...(await resolveEvent(ctx.firm.id, body.id, body.decision)) });
  } catch (error) {
    return serverError("api.automation_events.resolve_failed", error, error instanceof Error ? error.message : "Failed");
  }
}
