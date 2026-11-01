import { NextRequest, NextResponse } from "next/server";
import { hasRole, requireFirmApi } from "@/lib/firms/context";
import {
  countFirmOwners,
  listFirmMembers,
  removeFirmMember,
  upsertFirmMember,
} from "@/lib/firms/repository";
import { sendAuthInvite } from "@/lib/firms/service";
import { formatValidationErrors, memberInputSchema } from "@/lib/firms/validation";
import { badRequest, readJson, serverError } from "@/lib/http/json";

export async function GET() {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;
  try {
    return NextResponse.json({ members: await listFirmMembers(ctx.firm.id) });
  } catch (error) {
    return serverError("api.members.list_failed", error);
  }
}

/** Add or change a member. Admins can add members/admins; only owners can grant owner. */
export async function POST(request: NextRequest) {
  const ctx = await requireFirmApi("admin");
  if (ctx instanceof NextResponse) return ctx;

  const parsed = memberInputSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest("Validation failed", formatValidationErrors(parsed.error));
  const { email, role } = parsed.data;
  if (role === "owner" && !hasRole(ctx, "owner")) {
    return NextResponse.json({ error: "Only owners can add owners" }, { status: 403 });
  }

  try {
    const members = await listFirmMembers(ctx.firm.id);
    const existing = members.find((m) => m.email === email);
    if (existing?.role === "owner" && role !== "owner" && (await countFirmOwners(ctx.firm.id)) <= 1) {
      return badRequest("A firm must keep at least one owner");
    }
    await upsertFirmMember(ctx.firm.id, email, role, ctx.user.email);
    const invite = existing ? "exists" : await sendAuthInvite(email);
    return NextResponse.json({ ok: true, invite, members: await listFirmMembers(ctx.firm.id) });
  } catch (error) {
    return serverError("api.members.add_failed", error);
  }
}

export async function DELETE(request: NextRequest) {
  const ctx = await requireFirmApi("admin");
  if (ctx instanceof NextResponse) return ctx;

  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (!email) return badRequest("email required");

  try {
    const members = await listFirmMembers(ctx.firm.id);
    const target = members.find((m) => m.email === email);
    if (!target) return badRequest("Not a member");
    if (target.role === "owner") {
      if (!hasRole(ctx, "owner")) return NextResponse.json({ error: "Only owners can remove owners" }, { status: 403 });
      if ((await countFirmOwners(ctx.firm.id)) <= 1) return badRequest("A firm must keep at least one owner");
    }
    await removeFirmMember(ctx.firm.id, email);
    return NextResponse.json({ ok: true, members: await listFirmMembers(ctx.firm.id) });
  } catch (error) {
    return serverError("api.members.remove_failed", error);
  }
}
