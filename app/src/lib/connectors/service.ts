import { z } from "zod";
import { callMcpTool, createCalendarEvent, mcpClientFor, sendNotification } from "@/lib/connectors/deliver";
import { assertPublicHttpsUrl, urlHint } from "@/lib/connectors/net";
import { fetchAccountEmail, type OAuthProvider } from "@/lib/connectors/oauth";
import {
  getConnector,
  insertConnector,
  patchConnector,
  type ConnectorRecord,
} from "@/lib/connectors/store";
import type { ConnectorView } from "@/lib/connectors/types";
import { isEncryptionConfigured, randomToken } from "@/lib/security/crypto";

const emails = z.array(z.string().trim().toLowerCase().email()).max(25);

export const createConnectorSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("email"), name: z.string().trim().min(1).max(80).default("Email alerts"), recipients: emails.min(1) }),
  z.object({
    type: z.enum(["slack", "teams", "zapier", "webhook"]),
    name: z.string().trim().min(1).max(80),
    url: z.string().trim().url(),
    signingSecret: z.string().trim().max(200).optional(),
  }),
  z.object({
    type: z.literal("mcp"),
    name: z.string().trim().min(1).max(80),
    url: z.string().trim().url(),
    authToken: z.string().trim().max(2000).optional(),
    allowAssistant: z.boolean().default(true),
  }),
  z.object({ type: z.literal("calendar_feed"), name: z.string().trim().min(1).max(80).default("Deadline calendar") }),
]);

export type CreateConnectorInput = z.infer<typeof createConnectorSchema>;

export async function createConnector(firmId: string, createdBy: string, input: CreateConnectorInput): Promise<ConnectorView> {
  switch (input.type) {
    case "email":
      return insertConnector({ firmId, createdBy, type: "email", name: input.name, config: { recipients: input.recipients } });
    case "calendar_feed":
      return insertConnector({ firmId, createdBy, type: "calendar_feed", name: input.name, config: { token: randomToken(24) } });
    case "mcp": {
      if (!isEncryptionConfigured()) throw new Error("Set CONNECTOR_ENCRYPTION_KEY before adding connectors with credentials");
      await assertPublicHttpsUrl(input.url);
      const headers: Record<string, string> = input.authToken
        ? { Authorization: /^bearer\s/i.test(input.authToken) ? input.authToken : `Bearer ${input.authToken}` }
        : {};
      // Discover tools up front so a bad URL/token fails immediately.
      const probe = { secret: { url: input.url, headers }, config: {} } as unknown as ConnectorRecord;
      const client = mcpClientFor(probe);
      await client.connect();
      const tools = await client.listTools();
      return insertConnector({
        firmId,
        createdBy,
        type: "mcp",
        name: input.name,
        config: { urlHint: urlHint(input.url), tools, allowAssistant: input.allowAssistant, allowedTools: tools.map((t) => t.name) },
        secret: { url: input.url, headers },
      });
    }
    default: {
      if (!isEncryptionConfigured()) throw new Error("Set CONNECTOR_ENCRYPTION_KEY before adding connectors with credentials");
      await assertPublicHttpsUrl(input.url);
      return insertConnector({
        firmId,
        createdBy,
        type: input.type,
        name: input.name,
        config: { urlHint: urlHint(input.url) },
        secret: { url: input.url, headers: input.signingSecret ? { "X-Signing-Secret": input.signingSecret } : {} },
      });
    }
  }
}

export async function createOAuthConnector(
  firmId: string,
  createdBy: string,
  provider: OAuthProvider,
  tokens: { access_token: string; refresh_token?: string; expires_at?: number },
) {
  const account = await fetchAccountEmail(provider, tokens.access_token);
  return insertConnector({
    firmId,
    createdBy,
    type: provider,
    name: provider === "google" ? `Google · ${account}` : `Microsoft 365 · ${account}`,
    config: { account, recipients: [createdBy] },
    secret: tokens,
  });
}

/** Exercise a connector end to end and record the outcome. */
export async function testConnector(firmId: string, id: string, actorEmail: string): Promise<{ ok: boolean; message: string }> {
  const connector = await getConnector(firmId, id);
  if (!connector) throw new Error("Connector not found");
  try {
    let message: string;
    switch (connector.type) {
      case "mcp": {
        const client = mcpClientFor(connector);
        await client.connect();
        const tools = await client.listTools();
        const allowed = (connector.config.allowedTools ?? []).filter((t) => tools.some((x) => x.name === t));
        await patchConnector(firmId, id, { config: { ...connector.config, tools, allowedTools: allowed.length ? allowed : tools.map((t) => t.name) } });
        message = `Connected — ${tools.length} tool(s) available`;
        break;
      }
      case "calendar_feed":
        message = "Feed is live. Subscribe to the URL from your calendar app.";
        break;
      default:
        message = await sendNotification(connector, {
          subject: "Smart Capture connector test",
          text: `This is a test message from Smart Capture, sent by ${actorEmail}. Your ${connector.name} connector is working.`,
          data: { test: true },
          to: connector.type === "google" || connector.type === "microsoft" ? [actorEmail] : undefined,
        });
    }
    await patchConnector(firmId, id, { status: "active", last_error: null, tested: true });
    return { ok: true, message };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Test failed";
    await patchConnector(firmId, id, { status: "error", last_error: message.slice(0, 500), tested: true });
    return { ok: false, message };
  }
}

export { callMcpTool, createCalendarEvent, sendNotification };
