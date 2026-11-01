import { describe, expect, it } from "vitest";
import { firmInputSchema, formatValidationErrors, slugify } from "@/lib/firms/validation";

const base = {
  legalName: "Acme Federal LLC",
  industry: "it_services",
  primaryNaics: "541512",
};

describe("firmInputSchema", () => {
  it("accepts a minimal firm and derives defaults", () => {
    const r = firmInputSchema.parse(base);
    expect(r.shortName).toBe("Acme Federal");
    expect(r.naicsCodes).toEqual(["541512"]);
    expect(r.assistantName).toBe("Acme Federal's Assistant");
    expect(r.goNoGo.minDaysToDeadline).toBe(5);
  });

  it("always includes the primary NAICS and de-duplicates", () => {
    const r = firmInputSchema.parse({ ...base, naicsCodes: ["541511", "541511"] });
    expect(r.naicsCodes).toEqual(["541512", "541511"]);
  });

  it("rejects invalid NAICS codes", () => {
    const r = firmInputSchema.safeParse({ ...base, naicsCodes: ["123456"] });
    expect(r.success).toBe(false);
    if (!r.success) expect(Object.values(formatValidationErrors(r.error))[0]).toMatch(/123456/);
  });

  it("rejects unknown industries", () => {
    expect(firmInputSchema.safeParse({ ...base, industry: "space-pirates" }).success).toBe(false);
  });

  it("validates UEI/CAGE format and upper-cases them", () => {
    expect(firmInputSchema.safeParse({ ...base, uei: "short" }).success).toBe(false);
    const r = firmInputSchema.parse({ ...base, uei: "g1xcpa2anmc3", cage: "15rt3" });
    expect(r.uei).toBe("G1XCPA2ANMC3");
    expect(r.cage).toBe("15RT3");
  });

  it("validates states and email domains", () => {
    expect(firmInputSchema.safeParse({ ...base, homeState: "ZZ" }).success).toBe(false);
    expect(firmInputSchema.parse({ ...base, homeState: "il" }).homeState).toBe("IL");
    expect(firmInputSchema.safeParse({ ...base, allowedEmailDomains: ["not a domain"] }).success).toBe(false);
    expect(firmInputSchema.safeParse({ ...base, allowedEmailDomains: ["gmail.com"] }).success).toBe(false);
    expect(firmInputSchema.parse({ ...base, allowedEmailDomains: ["Acme.com"] }).allowedEmailDomains).toEqual(["acme.com"]);
  });
});

describe("slugify", () => {
  it("strips entity suffixes", () => {
    expect(slugify("DFEAL LLC")).toBe("dfeal");
    expect(slugify("Acme & Sons, Inc.")).toBe("acme-sons");
  });
});
