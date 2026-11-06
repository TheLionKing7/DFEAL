import { NextRequest, NextResponse } from "next/server";
import { testConnector } from "@/lib/connectors/service";
import { requireFirmApi } from "@/lib/firms/context";
import { serverError } from "@/lib/http/json";
import { rateLimit } from "@/lib/http/rate-limit";

export const maxDuration = 60;

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireFirmApi("admin");
  if (ctx instanceof NextResponse) return ctx;
  const limited = rateLimit(`connector-test:${ctx.user.email}`, 10, 60_000);
  if (limited) return limited;
  const { id } = await params;
  try {
    return NextResponse.json(await testConnector(ctx.firm.id, id, ctx.user.email));
  } catch (error) {
    return serverError("api.connectors.test_failed", error, "Test failed");
  }
}
