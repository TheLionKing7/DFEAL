import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Allow localhost for this test only (production guard is covered in net.test.ts).
vi.mock("@/lib/connectors/net", () => ({
  safeFetch: (url: string, init: RequestInit & { timeoutMs?: number }) => {
    const { timeoutMs: _t, ...rest } = init;
    void _t;
    return fetch(url, rest);
  },
}));

import { McpClient } from "@/lib/connectors/mcp";

let server: Server;
let url = "";
const seen: string[] = [];

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const msg = JSON.parse(body) as { id?: number; method: string; params?: { name?: string; arguments?: { q?: string } } };
      seen.push(`${msg.method}:${req.headers["mcp-session-id"] ?? "-"}:${req.headers.authorization ?? "-"}`);
      if (msg.id === undefined) {
        res.writeHead(202).end();
        return;
      }
      const result =
        msg.method === "initialize"
          ? { protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "mock" } }
          : msg.method === "tools/list"
            ? { tools: [{ name: "search", description: "Search CRM", inputSchema: { type: "object" } }] }
            : { content: [{ type: "text", text: `found ${msg.params?.arguments?.q}` }] };
      const payload = JSON.stringify({ jsonrpc: "2.0", id: msg.id, result });
      if (msg.method === "tools/call") {
        // SSE response path
        res.writeHead(200, { "Content-Type": "text/event-stream", "Mcp-Session-Id": "s1" });
        res.end(`event: message\ndata: ${payload}\n\n`);
      } else {
        res.writeHead(200, { "Content-Type": "application/json", "Mcp-Session-Id": "s1" });
        res.end(payload);
      }
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  const addr = server.address() as { port: number };
  url = `http://127.0.0.1:${addr.port}/mcp`;
});

afterAll(() => {
  server.close();
});

describe("McpClient", () => {
  it("initialises, lists tools and calls a tool (JSON + SSE responses)", async () => {
    const client = new McpClient(url, { Authorization: "Bearer t0k" });
    await client.connect();
    const tools = await client.listTools();
    expect(tools[0]).toMatchObject({ name: "search", description: "Search CRM" });
    expect(await client.callTool("search", { q: "VA" })).toBe("found VA");
    expect(seen).toEqual([
      "initialize:-:Bearer t0k",
      "notifications/initialized:s1:Bearer t0k",
      "tools/list:s1:Bearer t0k",
      "tools/call:s1:Bearer t0k",
    ]);
  });
});
