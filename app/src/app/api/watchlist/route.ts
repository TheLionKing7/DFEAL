import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-user";
import {
  addPursuit,
  listPursuits,
  removePursuit,
  updatePursuit,
} from "@/lib/db/pursuits";
import { isDatabaseConfigured } from "@/lib/db/supabase-admin";
import type { PursuitStage } from "@/shared/opportunity-lanes";

export async function GET() {
  const user = await requireApiUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const pursuits = await listPursuits(user.email);
  return NextResponse.json({ pursuits });
}

export async function POST(request: NextRequest) {
  const user = await requireApiUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const body = (await request.json()) as { opportunity_id?: string; notes?: string };
  if (!body.opportunity_id) {
    return NextResponse.json({ error: "opportunity_id required" }, { status: 400 });
  }

  const pursuit = await addPursuit(user.email, body.opportunity_id, body.notes);
  return NextResponse.json({ ok: true, pursuit });
}

export async function PATCH(request: NextRequest) {
  const user = await requireApiUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const body = (await request.json()) as {
    opportunity_id?: string;
    notes?: string;
    pursuit_stage?: PursuitStage;
  };
  if (!body.opportunity_id) {
    return NextResponse.json({ error: "opportunity_id required" }, { status: 400 });
  }

  const pursuit = await updatePursuit(user.email, body.opportunity_id, {
    notes: body.notes,
    pursuit_stage: body.pursuit_stage,
  });
  return NextResponse.json({ ok: true, pursuit });
}

export async function DELETE(request: NextRequest) {
  const user = await requireApiUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const opportunityId = request.nextUrl.searchParams.get("opportunity_id");
  if (!opportunityId) {
    return NextResponse.json({ error: "opportunity_id required" }, { status: 400 });
  }

  await removePursuit(user.email, opportunityId);
  return NextResponse.json({ ok: true });
}
