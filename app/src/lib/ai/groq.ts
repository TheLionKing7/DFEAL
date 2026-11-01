import Groq from "groq-sdk";
import { getGroqApiKey, getGroqModel } from "@/lib/env";

let client: Groq | null = null;

function getClient(): Groq {
  if (!client) {
    client = new Groq({
      apiKey: getGroqApiKey(),
      timeout: Number(process.env.LLM_TIMEOUT_MS ?? 90_000),
      maxRetries: 1,
    });
  }
  return client;
}

export async function groqComplete(options: {
  system: string;
  userPrompt: string;
  maxTokens?: number;
}): Promise<string> {
  const response = await getClient().chat.completions.create({
    model: getGroqModel(),
    max_tokens: options.maxTokens ?? 2048,
    messages: [
      { role: "system", content: options.system },
      { role: "user", content: options.userPrompt },
    ],
  });

  return response.choices[0]?.message?.content ?? "";
}
