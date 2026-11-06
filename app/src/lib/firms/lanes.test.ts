import { describe, expect, it } from "vitest";
import { resolveLane, scopedStates, workspaceLanes } from "@/lib/firms/lanes";
import { DEFAULT_WORKSPACE } from "@/lib/firms/types";

const base = { homeState: "IL", targetStates: ["GA", "OH"], workspace: { ...DEFAULT_WORKSPACE } };

describe("workspace lanes", () => {
  it("always includes federal and a home-state lane", () => {
    const ids = workspaceLanes(base).map((l) => l.id);
    expect(ids).toEqual(["federal", "home", "state", "local", "education", "grants"]);
    expect(workspaceLanes(base)[1].label).toBe("Illinois (home)");
  });

  it("hides disabled lanes and the state lane for home-only scope", () => {
    const ids = workspaceLanes({
      ...base,
      workspace: { ...DEFAULT_WORKSPACE, stateScope: "home_only", local: false, grants: false },
    }).map((l) => l.id);
    expect(ids).toEqual(["federal", "home", "education"]);
  });

  it("computes the state scope", () => {
    expect(scopedStates(base)).toEqual(["IL", "GA", "OH"]);
    expect(scopedStates({ ...base, workspace: { ...DEFAULT_WORKSPACE, stateScope: "all" } })).toBeNull();
    expect(scopedStates({ ...base, workspace: { ...DEFAULT_WORKSPACE, stateScope: "home_only" } })).toEqual(["IL"]);
  });

  it("maps retired state-specific lanes", () => {
    expect(resolveLane(base, "illinois").lane.id).toBe("home");
    expect(resolveLane(base, "georgia")).toMatchObject({ lane: { id: "state" }, stateFilter: "GA" });
    expect(resolveLane(base, "bogus").lane.id).toBe("federal");
  });
});
