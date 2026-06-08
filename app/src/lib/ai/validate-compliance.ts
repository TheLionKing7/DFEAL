import { buildDfealSystemPrompt } from "@/config/dfeal-profile";
import { llmComplete } from "@/lib/ai/complete";
import { parseJsonFromLlm } from "@/lib/ai/parse-json";
import { saveComplianceRun } from "@/lib/db/compliance";
import type { Opportunity } from "@/shared/types/opportunity";

export interface ComplianceItem {
  id: string;
  section: string;
  requirement: string;
  status: "pass" | "fail" | "review";
  notes: string;
}

export interface ComplianceResult {
  items: ComplianceItem[];
  pass_count: number;
  fail_count: number;
  summary: string;
  provider: string;
  run_id: string;
}

export async function validateOpportunityCompliance(input: {
  opp: Opportunity;
  documentContent?: string;
  documentId?: string;
}) {
  const { opp, documentContent, documentId } = input;

  const userPrompt = [
    "You are a federal proposal compliance reviewer for Section L (instructions) and Section M (evaluation criteria).",
    "Review this opportunity and any draft content. Return ONLY JSON:",
    "{ summary: string, items: [{ id, section, requirement, status: pass|fail|review, notes }] }",
    "",
    `Title: ${opp.title}`,
    `Agency: ${opp.agency_name}`,
    `Set-aside: ${opp.set_aside}`,
    "",
    "Solicitation description:",
    opp.description?.slice(0, 3500) ?? "(none)",
    documentContent
      ? `\nDraft proposal content:\n${documentContent.slice(0, 3000)}`
      : "\n(No draft document — validate against solicitation requirements only)",
  ].join("\n");

  const { text, provider } = await llmComplete({
    userPrompt: `${buildDfealSystemPrompt()}\n\n${userPrompt}`,
    maxTokens: 2500,
  });

  const parsed = parseJsonFromLlm(text);
  const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
  const items: ComplianceItem[] = rawItems.map((item, index) => {
    const row = item as Record<string, unknown>;
    const status = String(row.status ?? "review").toLowerCase();
    return {
      id: String(row.id ?? `item-${index + 1}`),
      section: String(row.section ?? "General"),
      requirement: String(row.requirement ?? ""),
      status: status === "pass" || status === "fail" ? status : "review",
      notes: String(row.notes ?? ""),
    };
  });

  const passCount = items.filter((i) => i.status === "pass").length;
  const failCount = items.filter((i) => i.status === "fail").length;

  const run = await saveComplianceRun({
    opportunity_id: opp.id,
    document_id: documentId,
    provider,
    checklist_json: { summary: parsed.summary, items },
    pass_count: passCount,
    fail_count: failCount,
  });

  return {
    items,
    pass_count: passCount,
    fail_count: failCount,
    summary: String(parsed.summary ?? "Compliance review complete."),
    provider,
    run_id: run.id,
  } satisfies ComplianceResult;
}
