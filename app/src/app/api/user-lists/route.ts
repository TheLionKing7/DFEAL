import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-user";
import {
  addToUserList,
  listUserOpportunityList,
  removeFromUserList,
  type OpportunityListType,
} from "@/lib/db/user-workspace";
import { isDatabaseConfigured } from "@/lib/db/supabase-admin";

export async function GET(request: NextRequest) {
  const user = await requireApiUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ items: [], storage: "none" });
  }

  const listType = request.nextUrl.searchParams.get("type") as OpportunityListType | null;
  if (listType !== "track" && listType !== "favorite") {
    return NextResponse.json({ error: "type must be track or favorite" }, { status: 400 });
  }

  try {
    const items = await listUserOpportunityList(user.email, listType);
    return NextResponse.json({ items, storage: "database" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load list";
    return NextResponse.json({ error: message, items: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await requireApiUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const body = (await request.json()) as {
    opportunity_id?: string;
    list_type?: OpportunityListType;
  };

  if (!body.opportunity_id || !body.list_type) {
    return NextResponse.json({ error: "opportunity_id and list_type required" }, { status: 400 });
  }

  try {
    const item = await addToUserList(user.email, body.opportunity_id, body.list_type);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await requireApiUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const opportunityId = request.nextUrl.searchParams.get("opportunity_id");
  const listType = request.nextUrl.searchParams.get("type") as OpportunityListType | null;

  if (!opportunityId || (listType !== "track" && listType !== "favorite")) {
    return NextResponse.json({ error: "opportunity_id and type required" }, { status: 400 });
  }

  try {
    await removeFromUserList(user.email, opportunityId, listType);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
