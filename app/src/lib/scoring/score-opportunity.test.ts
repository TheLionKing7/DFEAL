import { describe, expect, it } from "vitest";
import { makeFirm, makeOpp } from "@/test/fixtures";
import { opportunityState, scoreOpportunity } from "@/lib/scoring/score-opportunity";

const itFirm = makeFirm();
const healthFirm = makeFirm({
  id: "00000000-0000-0000-0000-000000000002",
  slug: "health",
  industry: "healthcare_consulting",
  primaryNaics: "541611",
  naicsCodes: ["541611", "621999"],
  keywords: ["clinical", "healthcare"],
  coreCompetencies: [],
  homeState: "IL",
  targetStates: [],
});

describe("scoreOpportunity (per firm)", () => {
  it("scores the same opportunity differently for different firms", () => {
    const opp = makeOpp();
    const it = scoreOpportunity(opp, itFirm);
    const health = scoreOpportunity(opp, healthFirm);
    expect(it.fit_score).toBeGreaterThan(health.fit_score);
    expect(it.rationale).toMatch(/Primary NAICS 541512/);
    expect(health.go_no_go).not.toBe("go");
    expect(health.rationale).toMatch(/same sector/);
  });

  it("gives home-state priority based on the firm's home state", () => {
    // Unlisted NAICS keeps the base score well below the 100 cap.
    const vaOpp = makeOpp({ naics: null, place_of_performance: { state: "VA" } });
    const txOpp = makeOpp({ naics: null, place_of_performance: { state: "TX" } });
    const va = scoreOpportunity(vaOpp, itFirm);
    const tx = scoreOpportunity(txOpp, itFirm);
    expect(va.fit_score - tx.fit_score).toBe(14);
    expect(va.rationale).toMatch(/Home-state priority \(VA\)/);
  });

  it("treats state-portal sources as in-state", () => {
    expect(opportunityState(makeOpp({ source: "bidbuy_il", place_of_performance: null }))).toBe("IL");
    const ilBid = makeOpp({ source: "bidbuy_il", naics: null, place_of_performance: null });
    expect(scoreOpportunity(ilBid, healthFirm).rationale).toMatch(/Home-state priority \(IL\)/);
  });

  it("marks deadlines below the firm minimum as no-go", () => {
    const soon = makeOpp({ response_deadline: new Date(Date.now() + 2 * 86_400_000).toISOString() });
    expect(scoreOpportunity(soon, itFirm).go_no_go).toBe("no_go");
  });

  it("penalizes excluded agencies", () => {
    const firm = makeFirm({ goNoGo: { ...itFirm.goNoGo, excludedAgencies: ["Veterans Affairs"] } });
    const base = scoreOpportunity(makeOpp(), itFirm).fit_score;
    const excluded = scoreOpportunity(makeOpp(), firm);
    expect(excluded.fit_score).toBeLessThan(base);
    expect(excluded.rationale).toMatch(/Excluded agency/);
  });

  it("matches short keywords on word boundaries only", () => {
    const firm = makeFirm({ keywords: ["it"], coreCompetencies: [] });
    const hit = scoreOpportunity(makeOpp({ title: "IT support services", description: "" }), firm);
    const miss = scoreOpportunity(makeOpp({ title: "Facility maintenance", description: "" }), firm);
    expect(hit.rationale).toMatch(/Competency alignment/);
    expect(miss.rationale).toMatch(/Low keyword alignment/);
  });

  it("keeps scores within 0-100", () => {
    const r = scoreOpportunity(makeOpp({ estimated_value_usd: 1 }), makeFirm({ goNoGo: { ...itFirm.goNoGo, minContractValueUsd: 10_000_000 } }));
    expect(r.fit_score).toBeGreaterThanOrEqual(0);
    expect(r.fit_score).toBeLessThanOrEqual(100);
  });
});
