import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireFirmApi } from "@/lib/firms/context";
import { formatValidationErrors } from "@/lib/firms/validation";
import { badRequest, notFound, readJson, serverError } from "@/lib/http/json";
import { MEMORY_CATEGORIES, createMemory, deleteMemory, listMemories, updateMemory } from "@/lib/memory/memories";

const createSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  category: z.enum(MEMORY_CATEGORIES).default("other"),
  scope: z.enum(["user", "firm"]).default("user"),
  pinned: z.boolean().default(false),
  opportunityId: z.string().max(200).nullable().optional(),
});

const patchSchema = z.object({
  content: z.string().trim().min(1).max(2000).optional(),
  category: z.enum(MEMORY_CATEGORIES).optional(),
  scope: z.enum(["user", "firm"]).optional(),
  pinned: z.boolean().optional(),
});

export async function GET() {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;
  try {
    const memories = await listMemories({ firmId: ctx.firm.id, userEmail: ctx.user.email });
    return NextResponse.json({ memories: memories.map((m) => ({ ...m, mine: m.user_email === ctx.user.email })) });
  } catch (error) {
    return serverError("api.memories.list_failed", error);
  }
}

export async function POST(request: NextRequest) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;
  const parsed = createSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest("Validation failed", formatValidationErrors(parsed.error));
  if (parsed.data.scope === "firm" && ctx.role === "member") {
    return NextResponse.json({ error: "Only admins can save firm-wide memories" }, { status: 403 });
  }
  try {
    const memory = await createMemory(
      { firmId: ctx.firm.id, userEmail: ctx.user.email },
      { ...parsed.data, memoryScope: parsed.data.scope, source: "user" },
    );
    return NextResponse.json({ ok: true, memory }, { status: 201 });
  } catch (error) {
    return serverError("api.memories.create_failed", error);
  }
}

export async function PATCH(request: NextRequest) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return badRequest("id required");
  const parsed = patchSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest("Validation failed", formatValidationErrors(parsed.error));
  if (parsed.data.scope === "firm" && ctx.role === "member") {
    return NextResponse.json({ error: "Only admins can save firm-wide memories" }, { status: 403 });
  }
  try {
    const memory = await updateMemory({ firmId: ctx.firm.id, userEmail: ctx.user.email }, id, {
      ...parsed.data,
      memoryScope: parsed.data.scope,
    });
    if (!memory) return notFound("Memory not found");
    return NextResponse.json({ ok: true, memory });
  } catch (error) {
    return serverError("api.memories.update_failed", error);
  }
}

export async function DELETE(request: NextRequest) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return badRequest("id required");
  try {
    await deleteMemory({ firmId: ctx.firm.id, userEmail: ctx.user.email }, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError("api.memories.delete_failed", error);
  }
}
