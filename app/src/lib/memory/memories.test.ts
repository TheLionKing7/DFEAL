import { describe, expect, it } from "vitest";
import { extractMemoryTags, formatMemoriesForPrompt } from "@/lib/memory/memories";
import { extractToolCalls } from "@/lib/ai/assistant";

describe("assistant memory tags", () => {
  it("extracts and strips [[remember]] tags", () => {
    const { text, memories } = extractMemoryTags(
      "Got it — I'll keep that in mind.\n[[remember:guideline|We never bid LPTA contracts.]]\n[[remember|Ola reviews proposals on Thursdays]]",
    );
    expect(text).toBe("Got it — I'll keep that in mind.");
    expect(memories).toEqual([
      { category: "guideline", content: "We never bid LPTA contracts." },
      { category: "other", content: "Ola reviews proposals on Thursdays" },
    ]);
  });

  it("formats memories within a budget", () => {
    const m = (content: string, pinned = false) =>
      ({ id: content, content, category: "workflow", scope: "user", pinned }) as Parameters<typeof formatMemoriesForPrompt>[0][number];
    const out = formatMemoriesForPrompt([m("a".repeat(50), true), m("b".repeat(50))], 80);
    expect(out.split("\n")).toHaveLength(1);
    expect(out).toContain("pinned");
  });
});

describe("assistant tool tags", () => {
  it("parses MCP tool calls", () => {
    const calls = extractToolCalls(
      '[[tool:123e4567-e89b-12d3-a456-426614174000:crm.search|{"query":"VA"}]]\n[[tool:bad|{}]]',
    );
    expect(calls).toEqual([
      { connectorId: "123e4567-e89b-12d3-a456-426614174000", tool: "crm.search", args: { query: "VA" } },
    ]);
  });
});
