import { buildDfealSystemPrompt } from "@/config/dfeal-profile";
import { llmComplete } from "@/lib/ai/complete";
import type { AssistantPageContext } from "@/shared/assistant-page-context";

export async function runAssistantChat(input: {
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
  pageContext: AssistantPageContext;
}) {
  const { message, history, pageContext } = input;

  const contextBlock = [
    `Current page: ${pageContext.label} (${pageContext.page})`,
    pageContext.summary ? `Context: ${pageContext.summary}` : "",
    pageContext.opportunity_id
      ? `Opportunity ID: ${pageContext.opportunity_id}`
      : "",
    pageContext.meta
      ? `Meta: ${JSON.stringify(pageContext.meta)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const historyBlock = history
    .slice(-8)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  const userPrompt = [
    "You are the DFEAL AI personal capture strategist. Your mission is to ensure every",
    "opportunity is pursued with strategic intelligence by leveraging on-demand information",
    "and speed. Help the team discover opportunities, design execution strategies, prioritize",
    "pursuits, identify teaming partners, mitigate compliance risks, and accelerate proposals.",
    "Be concise, decisive, and actionable. Use bullet points and numbered steps when helpful.",
    "Reference DFEAL profile strengths, NAICS, and certifications when relevant.",
    "",
    contextBlock,
    historyBlock ? `\nConversation:\n${historyBlock}` : "",
    `\nUSER: ${message}`,
    "\nASSISTANT:",
  ].join("\n");

  const { text, provider } = await llmComplete({
    userPrompt: `${buildDfealSystemPrompt()}\n\n${userPrompt}`,
    maxTokens: 1500,
  });

  return { reply: text.trim(), provider };
}
