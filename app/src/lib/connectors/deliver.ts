import { createHmac } from "node:crypto";
import { McpClient } from "@/lib/connectors/mcp";
import { safeFetch } from "@/lib/connectors/net";
import { refreshTokens, type OAuthProvider } from "@/lib/connectors/oauth";
import { patchConnector, type ConnectorRecord } from "@/lib/connectors/store";
import type { CalendarEventInput, ConnectorSecret, NotificationMessage } from "@/lib/connectors/types";
import { SMART_CAPTURE } from "@/config/platform";

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function textToHtml(text: string): string {
  return `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;color:#1a2332">${escapeHtml(text)
    .replace(/\n/g, "<br/>")}</div>`;
}

/** Platform mailer (Resend). */
export async function sendPlatformEmail(to: string[], subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured — platform email is unavailable");
  if (to.length === 0) throw new Error("No email recipients configured");
  const from = process.env.RESEND_FROM_EMAIL?.trim() || `${SMART_CAPTURE.name} <onboarding@resend.dev>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/** Valid OAuth access token, refreshing (and persisting) when close to expiry. */
async function oauthToken(connector: ConnectorRecord): Promise<string> {
  let secret = connector.secret;
  if (!secret?.access_token) throw new Error("Account is not connected");
  if (!secret.expires_at || secret.expires_at < Date.now() + 60_000) {
    secret = await refreshTokens(connector.type as OAuthProvider, secret);
    await patchConnector(connector.firm_id, connector.id, { secret });
    connector.secret = secret;
  }
  return secret.access_token!;
}

function base64Url(s: string) {
  return Buffer.from(s, "utf8").toString("base64url");
}

async function sendGmail(connector: ConnectorRecord, to: string[], subject: string, html: string) {
  const token = await oauthToken(connector);
  const mime = [
    `To: ${to.join(", ")}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "",
    html,
  ].join("\r\n");
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: base64Url(mime) }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Gmail send failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
}

async function sendOutlook(connector: ConnectorRecord, to: string[], subject: string, html: string) {
  const token = await oauthToken(connector);
  const res = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: "HTML", content: html },
        toRecipients: to.map((address) => ({ emailAddress: { address } })),
      },
      saveToSentItems: true,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Outlook send failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
}

function webhookSignature(body: string, secret: ConnectorSecret) {
  const key = secret.headers?.["X-Signing-Secret"];
  return key ? createHmac("sha256", key).update(body).digest("hex") : undefined;
}

/** Deliver a notification through any notify-capable connector. */
export async function sendNotification(connector: ConnectorRecord, message: NotificationMessage): Promise<string> {
  const html = message.html ?? textToHtml(message.text);
  switch (connector.type) {
    case "email": {
      const to = message.to?.length ? message.to : connector.config.recipients ?? [];
      await sendPlatformEmail(to, message.subject, html);
      return `Emailed ${to.length} recipient(s)`;
    }
    case "google":
    case "microsoft": {
      const to = message.to?.length ? message.to : connector.config.recipients ?? [];
      if (to.length === 0) throw new Error("No recipients for this connector");
      if (connector.type === "google") await sendGmail(connector, to, message.subject, html);
      else await sendOutlook(connector, to, message.subject, html);
      return `Sent from ${connector.config.account ?? connector.type} to ${to.length} recipient(s)`;
    }
    case "slack":
    case "teams":
    case "zapier":
    case "webhook": {
      const url = connector.secret?.url;
      if (!url) throw new Error("Webhook URL missing");
      const payload =
        connector.type === "slack"
          ? { text: `*${message.subject}*\n${message.text}` }
          : connector.type === "teams"
            ? { text: `**${message.subject}**\n\n${message.text.replace(/\n/g, "\n\n")}` }
            : { event: "smart_capture.notification", subject: message.subject, text: message.text, data: message.data ?? {} };
      const body = JSON.stringify(payload);
      const signature = connector.secret ? webhookSignature(body, connector.secret) : undefined;
      const extraHeaders = { ...(connector.secret?.headers ?? {}) };
      delete extraHeaders["X-Signing-Secret"];
      const res = await safeFetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...extraHeaders,
          ...(signature ? { "X-Smart-Capture-Signature": `sha256=${signature}` } : {}),
        },
        body,
      });
      if (!res.ok) throw new Error(`${connector.type} responded ${res.status}`);
      return `Posted to ${connector.name}`;
    }
    default:
      throw new Error(`${connector.type} connectors cannot send notifications`);
  }
}

function dateOnly(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

function nextDay(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export async function createCalendarEvent(connector: ConnectorRecord, event: CalendarEventInput): Promise<string> {
  const day = dateOnly(event.date);
  const description = event.url ? `${event.description}\n\n${event.url}` : event.description;
  if (connector.type === "google") {
    const token = await oauthToken(connector);
    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ summary: event.title, description, start: { date: day }, end: { date: nextDay(day) } }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`Google Calendar failed (${res.status})`);
    return "Added to Google Calendar";
  }
  if (connector.type === "microsoft") {
    const token = await oauthToken(connector);
    const res = await fetch("https://graph.microsoft.com/v1.0/me/events", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: event.title,
        body: { contentType: "Text", content: description },
        isAllDay: true,
        start: { dateTime: `${day}T00:00:00`, timeZone: "UTC" },
        end: { dateTime: `${nextDay(day)}T00:00:00`, timeZone: "UTC" },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`Outlook Calendar failed (${res.status})`);
    return "Added to Outlook Calendar";
  }
  throw new Error(`${connector.type} connectors cannot create calendar events`);
}

export function mcpClientFor(connector: ConnectorRecord): McpClient {
  if (!connector.secret?.url) throw new Error("MCP server URL missing");
  return new McpClient(connector.secret.url, connector.secret.headers ?? {});
}

export async function callMcpTool(
  connector: ConnectorRecord,
  tool: string,
  args: Record<string, unknown>,
): Promise<string> {
  const allowed = connector.config.allowedTools;
  if (allowed && allowed.length > 0 && !allowed.includes(tool)) {
    throw new Error(`Tool "${tool}" is not enabled for ${connector.name}`);
  }
  const client = mcpClientFor(connector);
  await client.connect();
  return client.callTool(tool, args);
}
