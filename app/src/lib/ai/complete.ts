import { claudeComplete } from "@/lib/ai/claude";
import { groqComplete } from "@/lib/ai/groq";
import { hasAnthropicApiKey, hasGroqApiKey } from "@/lib/env";

export type LlmProvider = "anthropic" | "groq";

export interface LlmCompleteResult {
  text: string;
  provider: LlmProvider;
}

export async function llmComplete(options: {
  userPrompt: string;
  maxTokens?: number;
}): Promise<LlmCompleteResult> {
  const errors: string[] = [];

  if (hasAnthropicApiKey()) {
    try {
      const text = await claudeComplete(options);
      return { text, provider: "anthropic" };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Claude request failed";
      errors.push(`Claude: ${message}`);
    }
  } else {
    errors.push("Claude: ANTHROPIC_API_KEY not configured");
  }

  if (hasGroqApiKey()) {
    try {
      const text = await groqComplete(options);
      return { text, provider: "groq" };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Groq request failed";
      errors.push(`Groq: ${message}`);
    }
  } else {
    errors.push("Groq: GROQ_API_KEY not configured");
  }

  throw new Error(`All LLM providers failed.\n${errors.join("\n")}`);
}

/** @deprecated Use llmComplete — kept for direct Claude calls */
export { claudeComplete } from "@/lib/ai/claude";
