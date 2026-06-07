import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicApiKey, getAnthropicModel } from "@/lib/env";
import { buildDfealSystemPrompt } from "@/config/dfeal-profile";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: getAnthropicApiKey() });
  }
  return client;
}

export async function claudeComplete(options: {
  userPrompt: string;
  maxTokens?: number;
}): Promise<string> {
  const response = await getClient().messages.create({
    model: getAnthropicModel(),
    max_tokens: options.maxTokens ?? 2048,
    system: buildDfealSystemPrompt(),
    messages: [{ role: "user", content: options.userPrompt }],
  });

  const block = response.content.find((b) => b.type === "text");
  return block?.type === "text" ? block.text : "";
}
