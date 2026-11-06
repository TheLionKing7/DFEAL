import { safeFetch } from "@/lib/connectors/net";
import type { McpToolInfo } from "@/lib/connectors/types";

/**
 * Minimal MCP client for remote servers using the Streamable HTTP transport
 * (JSON-RPC over POST; responses as JSON or a short SSE stream).
 */
const PROTOCOL_VERSION = "2025-06-18";

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id?: number | string;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

function parseSse(body: string, id: number): JsonRpcResponse | null {
  for (const block of body.split(/\n\n+/)) {
    const data = block
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trim())
      .join("");
    if (!data) continue;
    try {
      const msg = JSON.parse(data) as JsonRpcResponse;
      if (msg.id === id) return msg;
    } catch {
      /* ignore non-JSON events */
    }
  }
  return null;
}

export class McpClient {
  private sessionId: string | null = null;
  private nextId = 1;

  constructor(
    private readonly url: string,
    private readonly headers: Record<string, string> = {},
  ) {}

  private async post(body: Record<string, unknown>, expectResponse: boolean): Promise<JsonRpcResponse | null> {
    const res = await safeFetch(this.url, {
      method: "POST",
      timeoutMs: 30_000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "MCP-Protocol-Version": PROTOCOL_VERSION,
        ...(this.sessionId ? { "Mcp-Session-Id": this.sessionId } : {}),
        ...this.headers,
      },
      body: JSON.stringify(body),
    });
    const sid = res.headers.get("mcp-session-id");
    if (sid) this.sessionId = sid;
    if (!res.ok && res.status !== 202) {
      throw new Error(`MCP server returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    if (!expectResponse) return null;
    const text = await res.text();
    const type = res.headers.get("content-type") ?? "";
    const msg = type.includes("text/event-stream") ? parseSse(text, body.id as number) : (JSON.parse(text) as JsonRpcResponse);
    if (!msg) throw new Error("MCP server sent no response");
    if (msg.error) throw new Error(`MCP error ${msg.error.code}: ${msg.error.message}`);
    return msg;
  }

  private async request(method: string, params: Record<string, unknown> = {}) {
    const id = this.nextId++;
    const msg = await this.post({ jsonrpc: "2.0", id, method, params }, true);
    return msg?.result ?? {};
  }

  async connect() {
    const result = await this.request("initialize", {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "smart-capture", version: "1.0.0" },
    });
    await this.post({ jsonrpc: "2.0", method: "notifications/initialized" }, false);
    return result;
  }

  async listTools(): Promise<McpToolInfo[]> {
    const result = await this.request("tools/list");
    const tools = Array.isArray(result.tools)
      ? (result.tools as { name: string; description?: string; inputSchema?: unknown }[])
      : [];
    return tools.slice(0, 100).map((t) => ({
      name: t.name,
      description: t.description?.slice(0, 300),
      inputSchema: t.inputSchema ? JSON.stringify(t.inputSchema).slice(0, 600) : undefined,
    }));
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<string> {
    const result = await this.request("tools/call", { name, arguments: args });
    const content = Array.isArray(result.content) ? (result.content as { type: string; text?: string }[]) : [];
    const text = content
      .filter((c) => c.type === "text" && c.text)
      .map((c) => c.text)
      .join("\n");
    if (result.isError) throw new Error(text || "Tool returned an error");
    return text || JSON.stringify(result).slice(0, 4000);
  }
}
