import { describe, expect, it } from "vitest";
import { INDUSTRY_PRESETS } from "@/lib/firms/industries";
import { isValidNaics } from "@/lib/naics";

describe("industry presets", () => {
  it("has unique keys", () => {
    const keys = INDUSTRY_PRESETS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(INDUSTRY_PRESETS.map((p) => [p.key, p.suggestedNaics] as const))(
    "%s only suggests valid NAICS 2022 codes",
    (_key, codes) => {
      for (const code of codes) expect(isValidNaics(code), code).toBe(true);
    },
  );
});
