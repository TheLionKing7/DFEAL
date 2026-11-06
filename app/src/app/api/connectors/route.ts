import { NextRequest, NextResponse } from "next/server";
import { isOAuthConfigured } from "@/lib/connectors/oauth";
import { createConnector, createConnectorSchema } from "@/lib/connectors/service";
import { listConnectors } from "@/lib/connectors/store";
import { requireFirmApi } from "@/lib/firms/context";
import { formatValidationErrors } from "@/lib/firms/validation";
import { badRequest, readJson, serverError } from "@/lib/http/json";
import { isEncryptionConfigured } from "@/lib/security/crypto";

export const maxDuration = 60;

export async function GET() {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;
  try {
    return NextResponse.json({
      connectors: await listConnectors(ctx.firm.id),
      canManage: ctx.role !== "member",
      available: {
        google: isOAuthConfigured("google"),
        microsoft: isOAuthConfigured("microsoft"),
        encryption: isEncryptionConfigured(),
        platformEmail: Boolean(process.env.RESEND_API_KEY?.trim()),
      },
    });
  } catch (error) {
    return serverError("api.connectors.list_failed", error);
  }
}

export async function POST(request: NextRequest) {
  const ctx = await requireFirmApi("admin");
  if (ctx instanceof NextResponse) return ctx;
  const parsed = createConnectorSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest("Validation failed", formatValidationErrors(parsed.error));
  try {
    const connector = await createConnector(ctx.firm.id, ctx.user.email, parsed.data);
    return NextResponse.json({ ok: true, connector }, { status: 201 });
  } catch (error) {
    // Validation-type failures (bad URL, MCP handshake) are safe to show.
    const message = error instanceof Error ? error.message : "Could not add connector";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
