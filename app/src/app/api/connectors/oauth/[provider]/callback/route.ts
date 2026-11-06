import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, type OAuthProvider } from "@/lib/connectors/oauth";
import { createOAuthConnector } from "@/lib/connectors/service";
import { getSessionUser } from "@/lib/firms/context";
import { logger } from "@/lib/logger";
import { verifyState } from "@/lib/security/crypto";

export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const back = new URL("/settings?tab=integrations", request.nextUrl.origin);
  const fail = (msg: string) => {
    back.searchParams.set("connector_error", msg);
    return NextResponse.redirect(back);
  };

  const code = request.nextUrl.searchParams.get("code");
  const stateRaw = request.nextUrl.searchParams.get("state");
  const providerError = request.nextUrl.searchParams.get("error_description") ?? request.nextUrl.searchParams.get("error");
  if (providerError) return fail(providerError.slice(0, 200));
  if (!code || !stateRaw) return fail("Missing authorization code");

  const state = verifyState<{ firmId: string; email: string; provider: string }>(stateRaw);
  const user = await getSessionUser();
  if (!state || state.provider !== provider || !user || user.email !== state.email) {
    return fail("Sign-in session expired — try connecting again");
  }

  try {
    const tokens = await exchangeCode(provider as OAuthProvider, code);
    if (!tokens.access_token) return fail("No access token returned");
    await createOAuthConnector(state.firmId, user.email, provider as OAuthProvider, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at,
    });
    back.searchParams.set("connected", provider);
    return NextResponse.redirect(back);
  } catch (error) {
    logger.error("oauth.callback_failed", { provider, error: error instanceof Error ? error.message : String(error) });
    return fail("Could not complete the connection");
  }
}
