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
    "You are the DFEAL Capture AI consultant. Help the capture team with bid decisions,",
    "proposal strategy, compliance, teaming, and federal/SLED procurement questions.",
    "Be concise and actionable. Reference DFEAL profile strengths when relevant.",
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
