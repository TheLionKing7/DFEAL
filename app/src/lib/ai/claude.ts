import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicApiKey, getAnthropicModel } from "@/lib/env";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: getAnthropicApiKey(),
      timeout: Number(process.env.LLM_TIMEOUT_MS ?? 90_000),
      maxRetries: 1,
    });
  }
  return client;
}

export async function claudeComplete(options: {
  system: string;
  userPrompt: string;
  maxTokens?: number;
}): Promise<string> {
  const response = await getClient().messages.create({
    model: getAnthropicModel(),
    max_tokens: options.maxTokens ?? 2048,
    system: options.system,
    messages: [{ role: "user", content: options.userPrompt }],
  });

  const block = response.content.find((b) => b.type === "text");
  return block?.type === "text" ? block.text : "";
}
