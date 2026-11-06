import { getSiteUrl } from "@/lib/env";
import type { ConnectorSecret } from "@/lib/connectors/types";

export type OAuthProvider = "google" | "microsoft";

interface ProviderConfig {
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string;
  clientId?: string;
  clientSecret?: string;
  extraAuthParams: Record<string, string>;
}

function providerConfig(provider: OAuthProvider): ProviderConfig {
  if (provider === "google") {
    return {
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scopes: "openid email https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar.events",
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID?.trim(),
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim(),
      extraAuthParams: { access_type: "offline", prompt: "consent", include_granted_scopes: "true" },
    };
  }
  const tenant = process.env.MICROSOFT_OAUTH_TENANT?.trim() || "common";
  return {
    authorizeUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
    tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    scopes: "offline_access openid email User.Read Mail.Send Calendars.ReadWrite",
    clientId: process.env.MICROSOFT_OAUTH_CLIENT_ID?.trim(),
    clientSecret: process.env.MICROSOFT_OAUTH_CLIENT_SECRET?.trim(),
    extraAuthParams: { prompt: "select_account" },
  };
}

export function isOAuthConfigured(provider: OAuthProvider): boolean {
  const c = providerConfig(provider);
  return Boolean(c.clientId && c.clientSecret);
}

export function oauthRedirectUri(provider: OAuthProvider): string {
  return `${getSiteUrl()}/api/connectors/oauth/${provider}/callback`;
}

export function buildAuthorizeUrl(provider: OAuthProvider, state: string): string {
  const c = providerConfig(provider);
  if (!c.clientId) throw new Error(`${provider} OAuth is not configured on this server`);
  const params = new URLSearchParams({
    client_id: c.clientId,
    redirect_uri: oauthRedirectUri(provider),
    response_type: "code",
    scope: c.scopes,
    state,
    ...c.extraAuthParams,
  });
  return `${c.authorizeUrl}?${params}`;
}

async function tokenRequest(provider: OAuthProvider, body: Record<string, string>): Promise<ConnectorSecret> {
  const c = providerConfig(provider);
  if (!c.clientId || !c.clientSecret) throw new Error(`${provider} OAuth is not configured on this server`);
  const res = await fetch(c.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: c.clientId, client_secret: c.clientSecret, ...body }),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(`${provider} token exchange failed: ${json.error_description ?? json.error ?? res.status}`);
  }
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
}

export function exchangeCode(provider: OAuthProvider, code: string) {
  return tokenRequest(provider, {
    code,
    grant_type: "authorization_code",
    redirect_uri: oauthRedirectUri(provider),
  });
}

export async function refreshTokens(provider: OAuthProvider, secret: ConnectorSecret): Promise<ConnectorSecret> {
  if (!secret.refresh_token) throw new Error("Connection expired — reconnect the account");
  const next = await tokenRequest(provider, { grant_type: "refresh_token", refresh_token: secret.refresh_token });
  return { ...next, refresh_token: next.refresh_token ?? secret.refresh_token };
}

export async function fetchAccountEmail(provider: OAuthProvider, accessToken: string): Promise<string> {
  const url =
    provider === "google"
      ? "https://openidconnect.googleapis.com/v1/userinfo"
      : "https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName";
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Could not read ${provider} account (${res.status})`);
  const json = (await res.json()) as { email?: string; mail?: string; userPrincipalName?: string };
  return json.email ?? json.mail ?? json.userPrincipalName ?? "connected account";
}
