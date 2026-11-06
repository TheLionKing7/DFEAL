import { describe, expect, it } from "vitest";
import { matchesFilters, opportunityLane, renderTemplate } from "@/lib/automations/engine";
import { automationConfigSchema } from "@/lib/automations/schema";
import { makeFirm, makeOpp } from "@/test/fixtures";

const firm = makeFirm({ homeState: "VA", targetStates: ["MD"] });
const cfg = (filters: Record<string, unknown> = {}) => automationConfigSchema.parse({ filters });

describe("automation matching", () => {
  it("classifies lanes", () => {
    expect(opportunityLane(makeOpp(), "VA")).toBe("federal");
    expect(opportunityLane(makeOpp({ source: "grants_gov" }), "VA")).toBe("grants");
    expect(opportunityLane(makeOpp({ source: "bidbuy_il", place_of_performance: { state: "IL" } }), "VA")).toBe("state");
    expect(opportunityLane(makeOpp({ source: "georgia", place_of_performance: { state: "VA" }, raw_data: { market_tier: "local" } }), "VA")).toBe("home");
  });

  it("applies fit, lane and keyword filters", () => {
    const opp = makeOpp();
    expect(matchesFilters(opp, 80, "go", cfg(), firm)).toBe(true);
    expect(matchesFilters(opp, 50, "go", cfg(), firm)).toBe(false);
    expect(matchesFilters(opp, 80, "go", cfg({ lanes: ["grants"] }), firm)).toBe(false);
    expect(matchesFilters(opp, 80, "go", cfg({ keywords: ["cloud"] }), firm)).toBe(true);
    expect(matchesFilters(opp, 80, "go", cfg({ keywords: ["janitorial"] }), firm)).toBe(false);
    expect(matchesFilters(opp, 80, "go", cfg({ naics: ["5415"] }), firm)).toBe(true);
    expect(matchesFilters(opp, 80, "no_go", cfg(), firm)).toBe(false);
  });

  it("limits SLED matches to the workspace state scope unless states are given", () => {
    const tx = makeOpp({ source: "demandstar", place_of_performance: { state: "TX" }, raw_data: { market_tier: "state" } });
    expect(matchesFilters(tx, 80, "go", cfg({ lanes: ["state"] }), firm)).toBe(false);
    expect(matchesFilters(tx, 80, "go", cfg({ lanes: ["state"], states: ["TX"] }), firm)).toBe(true);
    const home = makeOpp({ source: "demandstar", place_of_performance: { state: "VA" }, raw_data: { market_tier: "state" } });
    expect(matchesFilters(home, 80, "go", cfg({ lanes: ["state"] }), firm)).toBe(true);
  });

  it("renders MCP argument templates", () => {
    const out = renderTemplate({ title: "{{title}}", nested: ["{{fit}}", 3] }, { opp: makeOpp(), fit: 82, goNoGo: "go", rationale: null, kind: "match" });
    expect(out).toEqual({ title: makeOpp().title, nested: ["82", 3] });
  });

  it("accepts NAICS prefixes but rejects junk", () => {
    expect(automationConfigSchema.safeParse({ filters: { naics: ["5415", "541512"] } }).success).toBe(true);
    expect(automationConfigSchema.safeParse({ filters: { naics: ["999999"] } }).success).toBe(false);
  });
});
