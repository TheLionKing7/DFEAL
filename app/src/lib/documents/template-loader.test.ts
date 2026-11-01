import { describe, expect, it } from "vitest";
import { fillTemplatePlaceholders } from "@/lib/documents/template-loader";
import { makeFirm, makeOpp } from "@/test/fixtures";

describe("fillTemplatePlaceholders", () => {
  it("fills firm and opportunity fields", () => {
    const out = fillTemplatePlaceholders(
      "{{LEGAL_NAME}} ({{SHORT_NAME}}) UEI {{UEI}} for {{AGENCY_NAME}} — NAICS {{NAICS}}",
      makeOpp(),
      makeFirm(),
    );
    expect(out).toBe("Acme Federal LLC (Acme) UEI ABCDEFGH1234 for Department of Veterans Affairs — NAICS 541512");
  });

  it("uses 'Pending' when SAM identifiers are missing", () => {
    expect(fillTemplatePlaceholders("{{UEI}}/{{CAGE}}", makeOpp(), makeFirm({ uei: null, cage: null }))).toBe(
      "Pending/Pending",
    );
  });
});
