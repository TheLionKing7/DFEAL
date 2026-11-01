import { NextRequest, NextResponse } from "next/server";
import { addPursuit, listPursuits, removePursuit, updatePursuit } from "@/lib/db/pursuits";
import { requireFirmApi } from "@/lib/firms/context";
import { badRequest, readJson, serverError } from "@/lib/http/json";
import { PURSUIT_STAGES, type PursuitStage } from "@/shared/opportunity-lanes";

export async function GET() {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;
  try {
    return NextResponse.json({ pursuits: await listPursuits(ctx.firm.id, ctx.user.email) });
  } catch (error) {
    return serverError("api.watchlist.get_failed", error);
  }
}

export async function POST(request: NextRequest) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;

  const body = await readJson<{ opportunity_id?: string; notes?: string }>(request);
  if (!body?.opportunity_id) return badRequest("opportunity_id required");

  try {
    const pursuit = await addPursuit(ctx.firm.id, ctx.user.email, body.opportunity_id, body.notes?.slice(0, 4000));
    return NextResponse.json({ ok: true, pursuit });
  } catch (error) {
    return serverError("api.watchlist.post_failed", error);
  }
}

export async function PATCH(request: NextRequest) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;

  const body = await readJson<{ opportunity_id?: string; notes?: string; pursuit_stage?: PursuitStage }>(request);
  if (!body?.opportunity_id) return badRequest("opportunity_id required");
  if (body.pursuit_stage && !PURSUIT_STAGES.some((s) => s.id === body.pursuit_stage)) {
    return badRequest("Invalid pursuit_stage");
  }

  try {
    const pursuit = await updatePursuit(ctx.firm.id, ctx.user.email, body.opportunity_id, {
      notes: body.notes?.slice(0, 4000),
      pursuit_stage: body.pursuit_stage,
    });
    return NextResponse.json({ ok: true, pursuit });
  } catch (error) {
    return serverError("api.watchlist.patch_failed", error);
  }
}

export async function DELETE(request: NextRequest) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;

  const opportunityId = request.nextUrl.searchParams.get("opportunity_id");
  if (!opportunityId) return badRequest("opportunity_id required");

  try {
    await removePursuit(ctx.firm.id, ctx.user.email, opportunityId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError("api.watchlist.delete_failed", error);
  }
}
