/**
 * Per-firm opportunity lanes. Client-safe (used by the sidebar).
 *
 * Federal (SAM.gov) is always on. The home-state lane appears when a home
 * state is set. State / Local / Education are limited to the workspace's
 * state scope; Grants can be switched off.
 */
import { stateName } from "@/lib/firms/states";
import type { WorkspaceSettings } from "@/lib/firms/types";

export type LaneId = "federal" | "home" | "state" | "local" | "education" | "grants";

export interface WorkspaceLane {
  id: LaneId;
  label: string;
  href: string;
  description: string;
}

export interface LaneFirm {
  homeState: string | null;
  targetStates: string[];
  workspace: WorkspaceSettings;
}

/** States visible in the state/local/education lanes. `null` means every state. */
export function scopedStates(firm: LaneFirm): string[] | null {
  const home = firm.homeState ? [firm.homeState] : [];
  switch (firm.workspace.stateScope) {
    case "all":
      return null;
    case "home_only":
      return home;
    case "selected":
    default:
      return [...new Set([...home, ...firm.targetStates])];
  }
}

function scopeLabel(firm: LaneFirm): string {
  const states = scopedStates(firm);
  if (states === null) return "all states";
  if (states.length === 0) return "no states selected";
  return states.join(", ");
}

export function workspaceLanes(firm: LaneFirm): WorkspaceLane[] {
  const lanes: WorkspaceLane[] = [
    {
      id: "federal",
      label: "Federal (SAM)",
      href: "/opportunities?lane=federal",
      description: "Active solicitations from SAM.gov, scored for your firm.",
    },
  ];
  if (firm.homeState) {
    lanes.push({
      id: "home",
      label: `${stateName(firm.homeState)} (home)`,
      href: "/opportunities?lane=home",
      description: `State, local and education bids in your home state (${firm.homeState}).`,
    });
  }
  if (firm.workspace.stateScope !== "home_only" || !firm.homeState) {
    lanes.push({
      id: "state",
      label: firm.workspace.stateScope === "all" ? "State (all states)" : "State",
      href: "/opportunities?lane=state",
      description: `State agency procurement — ${scopeLabel(firm)}.`,
    });
  }
  if (firm.workspace.local) {
    lanes.push({
      id: "local",
      label: "Local",
      href: "/opportunities?lane=local",
      description: `City, county and municipal bids — ${scopeLabel(firm)}.`,
    });
  }
  if (firm.workspace.education) {
    lanes.push({
      id: "education",
      label: "Education",
      href: "/opportunities?lane=education",
      description: `K-12 and higher-education procurement — ${scopeLabel(firm)}.`,
    });
  }
  if (firm.workspace.grants) {
    lanes.push({
      id: "grants",
      label: "Grants",
      href: "/opportunities?lane=grants",
      description: "Federal grants via Grants.gov and SBA programs.",
    });
  }
  return lanes;
}

const LEGACY_LANES: Record<string, string> = { illinois: "IL", ohio: "OH", georgia: "GA" };

/** Resolve a `?lane=` value (including retired state-specific lanes) for this firm. */
export function resolveLane(
  firm: LaneFirm,
  raw: string | undefined,
): { lane: WorkspaceLane; stateFilter?: string } {
  const lanes = workspaceLanes(firm);
  const legacyState = raw ? LEGACY_LANES[raw] : undefined;
  if (legacyState) {
    const home = lanes.find((l) => l.id === "home");
    if (home && firm.homeState === legacyState) return { lane: home };
    const state = lanes.find((l) => l.id === "state") ?? lanes[0];
    return { lane: state, stateFilter: legacyState };
  }
  return { lane: lanes.find((l) => l.id === raw) ?? lanes[0] };
}
