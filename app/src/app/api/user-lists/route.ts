import { NextRequest, NextResponse } from "next/server";
import {
  addToUserList,
  listUserOpportunityList,
  removeFromUserList,
  type OpportunityListType,
} from "@/lib/db/user-workspace";
import { requireFirmApi } from "@/lib/firms/context";
import { badRequest, readJson, serverError } from "@/lib/http/json";

function isListType(v: unknown): v is OpportunityListType {
  return v === "track" || v === "favorite";
}

export async function GET(request: NextRequest) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;

  const listType = request.nextUrl.searchParams.get("type");
  if (!isListType(listType)) return badRequest("type must be track or favorite");

  try {
    const items = await listUserOpportunityList(ctx.firm.id, ctx.user.email, listType);
    return NextResponse.json({ items, storage: "database" });
  } catch (error) {
    return serverError("api.user_lists.get_failed", error, "Failed to load list");
  }
}

export async function POST(request: NextRequest) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;

  const body = await readJson<{ opportunity_id?: string; list_type?: string }>(request);
  if (!body?.opportunity_id || !isListType(body.list_type)) {
    return badRequest("opportunity_id and list_type required");
  }

  try {
    const item = await addToUserList(ctx.firm.id, ctx.user.email, body.opportunity_id, body.list_type);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    return serverError("api.user_lists.post_failed", error, "Failed to add");
  }
}

export async function DELETE(request: NextRequest) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;

  const opportunityId = request.nextUrl.searchParams.get("opportunity_id");
  const listType = request.nextUrl.searchParams.get("type");
  if (!opportunityId || !isListType(listType)) return badRequest("opportunity_id and type required");

  try {
    await removeFromUserList(ctx.firm.id, ctx.user.email, opportunityId, listType);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError("api.user_lists.delete_failed", error, "Failed to remove");
  }
}
