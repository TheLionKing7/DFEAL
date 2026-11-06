import { NextRequest, NextResponse } from "next/server";
import { buildAuthorizeUrl, isOAuthConfigured, type OAuthProvider } from "@/lib/connectors/oauth";
import { requireFirmApi } from "@/lib/firms/context";
import { isEncryptionConfigured, signState } from "@/lib/security/crypto";

export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const ctx = await requireFirmApi("admin");
  if (ctx instanceof NextResponse) return ctx;
  const { provider } = await params;
  if (provider !== "google" && provider !== "microsoft") {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }
  const back = new URL("/settings?tab=integrations", request.nextUrl.origin);
  if (!isOAuthConfigured(provider) || !isEncryptionConfigured()) {
    back.searchParams.set("connector_error", `${provider} sign-in is not configured on this server`);
    return NextResponse.redirect(back);
  }
  const state = signState({ firmId: ctx.firm.id, email: ctx.user.email, provider });
  return NextResponse.redirect(buildAuthorizeUrl(provider as OAuthProvider, state));
}
