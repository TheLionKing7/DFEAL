import { formatPersonalization, parsePersonalization } from "@/lib/assistant/personalization";
import { preprocessAssistantContent } from "@/lib/assistant/format-message";
import { llmComplete } from "@/lib/ai/complete";
import { callMcpTool } from "@/lib/connectors/deliver";
import { listConnectorRecords, type ConnectorRecord } from "@/lib/connectors/store";
import { listHotOpportunities } from "@/lib/db/opportunities";
import { listLaneOpportunities } from "@/lib/db/lane-opportunities";
import { referenceCatalogue } from "@/lib/documents/reference";
import { listPursuits } from "@/lib/db/pursuits";
import type { AssistantSettings } from "@/lib/db/user-workspace";
import { buildFirmSystemPrompt } from "@/lib/firms/prompt";
import type { FirmProfile } from "@/lib/firms/types";
import { logger } from "@/lib/logger";
import { extractMemoryTags, formatMemoriesForPrompt, type Memory } from "@/lib/memory/memories";
import type { AssistantPageContext } from "@/shared/assistant-page-context";

export interface AssistantOpportunityRef {
  id: string;
  title: string;
  agency_name: string | null;
  response_deadline: string | null;
  fit_score: number | null;
  go_no_go: string | null;
}

const TOOL_TAG = /\[\[tool:([0-9a-f-]{36}):([A-Za-z0-9_.\-/]+)\|(\{[\s\S]*?\})\]\]/g;

interface ToolCall {
  connectorId: string;
  tool: string;
  args: Record<string, unknown>;
}

export function extractToolCalls(text: string): ToolCall[] {
  const calls: ToolCall[] = [];
  for (const m of text.matchAll(TOOL_TAG)) {
    try {
      calls.push({ connectorId: m[1], tool: m[2], args: JSON.parse(m[3]) as Record<string, unknown> });
    } catch {
      /* malformed JSON — ignore */
    }
  }
  return calls.slice(0, 3);
}

function toolsBlock(connectors: ConnectorRecord[]): string {
  const lines: string[] = [];
  for (const c of connectors) {
    const allowed = new Set(c.config.allowedTools ?? []);
    for (const t of c.config.tools ?? []) {
      if (!allowed.has(t.name)) continue;
      lines.push(`- connector ${c.id} (${c.name}) · tool "${t.name}": ${t.description ?? ""}${t.inputSchema ? ` · args schema ${t.inputSchema}` : ""}`);
    }
  }
  return lines.slice(0, 40).join("\n");
}

export async function runAssistantChat(input: {
  firm: FirmProfile;
  userEmail: string;
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
  pageContext: AssistantPageContext;
  settings?: AssistantSettings;
  memories?: Memory[];
  favoriteIds?: string[];
  hotOpportunities?: AssistantOpportunityRef[];
}) {
  const { firm, userEmail, message, history, pageContext, settings, memories = [], favoriteIds = [] } = input;

  const [hot, pursuits, mcpConnectors, refDocs, homeLane] = await Promise.all([
    input.hotOpportunities
      ? Promise.resolve(input.hotOpportunities)
      : listHotOpportunities(firm.id, 10)
          .then((rows) =>
            rows.map((o) => ({
              id: o.id,
              title: o.title,
              agency_name: o.agency_name,
              response_deadline: o.response_deadline,
              fit_score: o.fit_score ?? null,
              go_no_go: o.go_no_go ?? null,
            })),
          )
          .catch(() => [] as AssistantOpportunityRef[]),
    listPursuits(firm.id, userEmail).catch(() => []),
    listConnectorRecords(firm.id, ["mcp"])
      .then((cs) => cs.filter((c) => c.config.allowAssistant !== false))
      .catch(() => [] as ConnectorRecord[]),
    referenceCatalogue(firm.id).catch(() => ""),
    firm.homeState
      ? listLaneOpportunities(firm, "home", { limit: 8 }).catch(() => [])
      : Promise.resolve([]),
  ]);

  const oppLines = hot
    .map(
      (o) =>
        `- [[opp:${o.id}|${o.title}]] · ${o.agency_name ?? "Agency TBD"} · Fit ${o.fit_score ?? "—"}% · Due ${o.response_deadline ? new Date(o.response_deadline).toLocaleDateString() : "TBD"}`,
    )
    .join("\n");

  const pursuitLines = pursuits
    .slice(0, 12)
    .map(
      (p) =>
        `- [[opp:${p.opportunity_id}|${p.title ?? p.opportunity_id}]] · stage ${p.pursuit_stage}${p.response_deadline ? ` · due ${new Date(p.response_deadline).toLocaleDateString()}` : ""}${p.notes ? ` · notes: ${p.notes.slice(0, 120)}` : ""}`,
    )
    .join("\n");

  const contextBlock = [
    `Current page: ${pageContext.label} (${pageContext.page})`,
    pageContext.summary ? `Context: ${pageContext.summary}` : "",
    pageContext.opportunity_id ? `Focused opportunity ID: ${pageContext.opportunity_id}` : "",
    pageContext.meta ? `Meta: ${JSON.stringify(pageContext.meta)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const personalization = formatPersonalization(parsePersonalization(settings?.personalization));
  const memoryBlock = formatMemoriesForPrompt(memories);
  const tools = toolsBlock(mcpConnectors);

  const historyBlock = history
    .slice(-8)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  const userPrompt = [
    `You are ${firm.assistantName}, the capture strategist for ${firm.legalName} on Smart Capture.`,
    "Write like a senior capture manager briefing a client — confident, specific, human.",
    "",
    "OUTPUT STYLE (strict):",
    "- No markdown syntax: no **, no __, no # headers, no ``` fences, no leading + or - list markers.",
    "- For lists, start each item with the bullet character • on its own line. Use \"1. \" only when order matters.",
    "- Lead with the answer, then 3–5 bullets max unless asked for depth.",
    "",
    "OPPORTUNITY LINKS: when naming a specific opportunity use exactly [[opp:OPPORTUNITY_ID|Title]] with real IDs from the lists below. Never invent IDs.",
    "",
    "MEMORY: when the user tells you something durable about their workflow, a task/assignment status, an opportunity decision,",
    "or an operating guideline, save it by adding on its own line: [[remember:CATEGORY|one-sentence fact]]",
    "CATEGORY is one of workflow, task, opportunity, guideline, preference. Do not re-save facts already in memory. The tag is hidden from the user.",
    tools
      ? [
          "",
          "TOOLS: you can call these connected MCP tools. To call one, reply with ONLY tool tags (one per line, max 3):",
          "[[tool:CONNECTOR_ID:TOOL_NAME|{json arguments}]]",
          "You will then receive the results and write the final answer. Only call a tool when it is needed to answer.",
          tools,
        ].join("\n")
      : "",
    "",
    contextBlock,
    personalization ? `\nWho you are working with (their mental model — tailor your reasoning to it):\n${personalization}` : "",
    memoryBlock ? `\nPersistent memory (workflows, task status, guidelines — treat as true unless the user corrects it):\n${memoryBlock}` : "",
    pursuitLines ? `\nThe user's active pursuits:\n${pursuitLines}` : "",
    refDocs
      ? `\nThe firm's reference documents (used automatically when drafting; suggest the Document generator for full drafts):\n${refDocs}`
      : "",
    favoriteIds.length ? `\nFavourite opportunity IDs (prioritise similar): ${favoriteIds.slice(0, 10).join(", ")}` : "",
    hot.length ? `\nHot opportunities for this firm:\n${oppLines}` : "",
    homeLane.length
      ? `\nBest-fit open bids in the home state (${firm.homeState}):\n${homeLane
          .map(
            (o) =>
              `- [[opp:${o.id}|${o.title}]] · ${o.agency_name ?? "Agency TBD"} · Fit ${o.fit_score ?? "—"}% · Due ${o.response_deadline ? new Date(o.response_deadline).toLocaleDateString() : "TBD"}`,
          )
          .join("\n")}`
      : "",
    historyBlock ? `\nConversation:\n${historyBlock}` : "",
    `\nUSER: ${message}`,
    "\nASSISTANT:",
  ].join("\n");

  const system = buildFirmSystemPrompt(firm);
  let { text, provider } = await llmComplete({ system, userPrompt, maxTokens: 1800 });

  const calls = tools ? extractToolCalls(text) : [];
  const toolResults: { tool: string; ok: boolean; output: string }[] = [];
  if (calls.length) {
    for (const call of calls) {
      const connector = mcpConnectors.find((c) => c.id === call.connectorId);
      try {
        if (!connector) throw new Error("Unknown connector");
        const output = await callMcpTool(connector, call.tool, call.args);
        toolResults.push({ tool: `${connector.name}/${call.tool}`, ok: true, output: output.slice(0, 6000) });
      } catch (error) {
        toolResults.push({ tool: call.tool, ok: false, output: error instanceof Error ? error.message : "Tool failed" });
      }
    }
    logger.info("assistant.tools_called", { firm: firm.slug, calls: toolResults.map((r) => `${r.tool}:${r.ok}`) });
    const followUp = await llmComplete({
      system,
      maxTokens: 1800,
      userPrompt: `${userPrompt.replace(/\nASSISTANT:$/, "")}\n\nTOOL RESULTS:\n${toolResults
        .map((r) => `${r.tool} (${r.ok ? "ok" : "error"}):\n${r.output}`)
        .join("\n\n")}\n\nNow answer the user using these results. Do not emit tool tags.\nASSISTANT:`,
    });
    text = followUp.text.replace(TOOL_TAG, "");
    provider = followUp.provider;
  }

  const { text: visible, memories: newMemories } = extractMemoryTags(text.replace(TOOL_TAG, ""));
  return { reply: preprocessAssistantContent(visible.trim()), provider, toolResults, newMemories };
}
