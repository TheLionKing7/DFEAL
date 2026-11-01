import { NextRequest, NextResponse } from "next/server";
import {
  deleteAutomation,
  listAutomations,
  upsertAutomation,
  type UserAutomation,
} from "@/lib/db/user-workspace";
import { requireFirmApi } from "@/lib/firms/context";
import { badRequest, readJson, serverError } from "@/lib/http/json";

export async function GET() {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;
  try {
    return NextResponse.json({ automations: await listAutomations(ctx.firm.id, ctx.user.email) });
  } catch (error) {
    return serverError("api.automations.get_failed", error);
  }
}

export async function POST(request: NextRequest) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;

  const body = await readJson<Partial<UserAutomation> & { name?: string }>(request);
  if (!body?.name?.trim()) return badRequest("name required");

  try {
    const automation = await upsertAutomation(ctx.firm.id, ctx.user.email, {
      id: body.id,
      name: body.name.trim().slice(0, 120),
      enabled: body.enabled,
      description: body.description?.slice(0, 1000) ?? null,
      config: body.config ?? {},
    });
    return NextResponse.json({ ok: true, automation });
  } catch (error) {
    return serverError("api.automations.post_failed", error);
  }
}

export async function DELETE(request: NextRequest) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return badRequest("id required");

  try {
    await deleteAutomation(ctx.firm.id, ctx.user.email, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError("api.automations.delete_failed", error);
  }
}
