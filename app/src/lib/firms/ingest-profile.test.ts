import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firms/repository", () => ({ listFirms: vi.fn() }));

import { buildIngestProfile } from "@/lib/firms/ingest-profile";
import { makeFirm } from "@/test/fixtures";

describe("buildIngestProfile", () => {
  it("unions NAICS and keywords across firms, primaries first", () => {
    const a = makeFirm({ primaryNaics: "541512", naicsCodes: ["541512", "541511"], keywords: ["Cloud"] });
    const b = makeFirm({ primaryNaics: "561720", naicsCodes: ["561720", "541511"], keywords: ["janitorial", "cloud"] });
    const p = buildIngestProfile([a, b]);
    expect(p.naicsCodes.slice(0, 2).sort()).toEqual(["541512", "561720"]);
    expect(p.naicsCodes).toContain("541511");
    expect(new Set(p.naicsCodes).size).toBe(p.naicsCodes.length);
    expect(p.keywords.sort()).toEqual(["cloud", "janitorial"]);
  });

  it("is empty with no firms", () => {
    expect(buildIngestProfile([]).naicsCodes).toEqual([]);
  });
});
