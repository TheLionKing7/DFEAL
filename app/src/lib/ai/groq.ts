import Groq from "groq-sdk";
import { getGroqApiKey, getGroqModel } from "@/lib/env";
import { buildDfealSystemPrompt } from "@/config/dfeal-profile";

let client: Groq | null = null;

function getClient(): Groq {
  if (!client) {
    client = new Groq({ apiKey: getGroqApiKey() });
  }
  return client;
}

export async function groqComplete(options: {
  userPrompt: string;
  maxTokens?: number;
}): Promise<string> {
  const response = await getClient().chat.completions.create({
    model: getGroqModel(),
    max_tokens: options.maxTokens ?? 2048,
    messages: [
      { role: "system", content: buildDfealSystemPrompt() },
      { role: "user", content: options.userPrompt },
    ],
  });

  return response.choices[0]?.message?.content ?? "";
}
