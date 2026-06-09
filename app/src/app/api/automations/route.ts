import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-user";
import {
  deleteAutomation,
  listAutomations,
  upsertAutomation,
  type UserAutomation,
} from "@/lib/db/user-workspace";
import { isDatabaseConfigured } from "@/lib/db/supabase-admin";

export async function GET() {
  const user = await requireApiUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) return NextResponse.json({ automations: [] });

  const automations = await listAutomations(user.email);
  return NextResponse.json({ automations });
}

export async function POST(request: NextRequest) {
  const user = await requireApiUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const body = (await request.json()) as Partial<UserAutomation> & { name?: string };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const automation = await upsertAutomation(user.email, {
    id: body.id,
    name: body.name.trim(),
    enabled: body.enabled,
    description: body.description ?? null,
    config: body.config ?? {},
  });

  return NextResponse.json({ ok: true, automation });
}

export async function DELETE(request: NextRequest) {
  const user = await requireApiUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await deleteAutomation(user.email, id);
  return NextResponse.json({ ok: true });
}
