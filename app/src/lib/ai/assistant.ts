import { buildDfealSystemPrompt } from "@/config/dfeal-profile";
import { preprocessAssistantContent } from "@/lib/assistant/format-message";
import { llmComplete } from "@/lib/ai/complete";
import { listHotOpportunities } from "@/lib/db/opportunities";
import type { AssistantSettings } from "@/lib/db/user-workspace";
import type { AssistantPageContext } from "@/shared/assistant-page-context";

export interface AssistantOpportunityRef {
  id: string;
  title: string;
  agency_name: string | null;
  response_deadline: string | null;
  fit_score: number | null;
  go_no_go: string | null;
}

export async function runAssistantChat(input: {
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
  pageContext: AssistantPageContext;
  settings?: AssistantSettings;
  favoriteIds?: string[];
  hotOpportunities?: AssistantOpportunityRef[];
}) {
  const { message, history, pageContext, settings, favoriteIds = [] } = input;

  let hot = input.hotOpportunities;
  if (!hot) {
    try {
      const rows = await listHotOpportunities(10);
      hot = rows.map((o) => ({
        id: o.id,
        title: o.title,
        agency_name: o.agency_name,
        response_deadline: o.response_deadline,
        fit_score: o.fit_score ?? null,
        go_no_go: o.go_no_go ?? null,
      }));
    } catch {
      hot = [];
    }
  }

  const oppLines = hot
    .map(
      (o) =>
        `- [[opp:${o.id}|${o.title}]] · ${o.agency_name ?? "Agency TBD"} · Fit ${o.fit_score ?? "—"}% · Due ${o.response_deadline ? new Date(o.response_deadline).toLocaleDateString() : "TBD"}`,
    )
    .join("\n");

  const contextBlock = [
    `Current page: ${pageContext.label} (${pageContext.page})`,
    pageContext.summary ? `Context: ${pageContext.summary}` : "",
    pageContext.opportunity_id
      ? `Focused opportunity ID: ${pageContext.opportunity_id}`
      : "",
    pageContext.meta ? `Meta: ${JSON.stringify(pageContext.meta)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const settingsBlock = [
    settings?.custom_instructions
      ? `Custom instructions: ${settings.custom_instructions}`
      : "",
    settings?.personalization?.focus
      ? `Capture focus: ${settings.personalization.focus}`
      : "",
    settings?.personalization?.tone ? `Tone: ${settings.personalization.tone}` : "",
    settings?.memories?.length
      ? `Memories:\n${settings.memories
          .slice(0, 8)
          .map((m) => `- ${m.text}`)
          .join("\n")}`
      : "",
    favoriteIds.length
      ? `User favourite opportunity IDs (prioritize similar): ${favoriteIds.slice(0, 10).join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const historyBlock = history
    .slice(-8)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  const userPrompt = [
    "You are DFEAL's professional capture strategist assistant for Smart Capture.",
    "Write like a senior capture manager briefing a client — confident, specific, human.",
    "",
    "OUTPUT STYLE (strict — violations feel robotic):",
    "- Do NOT use markdown syntax: no **, no __, no # headers, no ``` fences, no leading + or - list markers.",
    "- Do NOT use asterisks for emphasis. Write plain labels like \"Recommendation:\" or \"Next step:\".",
    "- Separate short paragraphs with a blank line.",
    "- For lists, put each item on its own line starting with the bullet character • (unicode bullet), not hyphen or plus.",
    "- For numbered steps use \"1. \" format only when order matters.",
    "- Keep responses focused: lead with the answer, then 3–5 bullets max unless the user asks for depth.",
    "",
    "OPPORTUNITY LINKS (required when naming a specific opportunity):",
    "Use exactly: [[opp:OPPORTUNITY_ID|Human-readable title]]",
    "Use real IDs from the hot list below. Never invent IDs.",
    "",
    contextBlock,
    settingsBlock ? `\nUser preferences:\n${settingsBlock}` : "",
    hot.length ? `\nHot opportunities (use [[opp:id|title]] when referencing):\n${oppLines}` : "",
    historyBlock ? `\nConversation:\n${historyBlock}` : "",
    `\nUSER: ${message}`,
    "\nASSISTANT:",
  ].join("\n");

  const { text, provider } = await llmComplete({
    userPrompt: `${buildDfealSystemPrompt()}\n\n${userPrompt}`,
    maxTokens: 1800,
  });

  return { reply: preprocessAssistantContent(text.trim()), provider };
}
