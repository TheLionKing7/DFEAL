/**
 * DeepSeek LLM provider — uses OpenAI-compatible API.
 * Configured via DEEPSEEK_API_KEY and DEEPSEEK_MODEL env vars.
 */
import { getDeepseekApiKey, getDeepseekModel, getDeepseekBaseUrl } from "@/lib/env";
import { buildDfealSystemPrompt } from "@/config/dfeal-profile";

interface DeepseekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface DeepseekChoice {
  message: DeepseekMessage;
  finish_reason: string;
}

interface DeepseekResponse {
  choices: DeepseekChoice[];
}

export async function deepseekComplete(options: {
  userPrompt: string;
  maxTokens?: number;
}): Promise<string> {
  const apiKey = getDeepseekApiKey();
  const model = getDeepseekModel();
  const baseUrl = getDeepseekBaseUrl();

  const messages: DeepseekMessage[] = [
    { role: "system", content: buildDfealSystemPrompt() },
    { role: "user", content: options.userPrompt },
  ];

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options.maxTokens ?? 4096,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `DeepSeek API error: ${response.status} ${response.statusText} — ${body.slice(0, 200)}`,
    );
  }

  const data = (await response.json()) as DeepseekResponse;
  return data.choices[0]?.message?.content ?? "";
}
