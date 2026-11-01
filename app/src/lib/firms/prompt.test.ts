import { describe, expect, it } from "vitest";
import { buildFirmSystemPrompt } from "@/lib/firms/prompt";
import { makeFirm } from "@/test/fixtures";

describe("buildFirmSystemPrompt", () => {
  it("describes the firm, its NAICS titles, and never another tenant", () => {
    const prompt = buildFirmSystemPrompt(makeFirm());
    expect(prompt).toContain("Acme Federal LLC");
    expect(prompt).toContain("541512 (primary) Computer Systems Design Services");
    expect(prompt).toContain("home state VA");
    expect(prompt).not.toMatch(/DFEAL/);
  });

  it("omits identifiers that are not on file", () => {
    const prompt = buildFirmSystemPrompt(makeFirm({ uei: null, cage: null }));
    expect(prompt).not.toContain("UEI:");
  });
});
