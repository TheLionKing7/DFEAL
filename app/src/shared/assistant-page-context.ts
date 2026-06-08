export type AssistantPageKind =
  | "explore"
  | "opportunities_list"
  | "opportunity_detail"
  | "agency_list"
  | "agency_detail"
  | "entity_lookup"
  | "watchlist"
  | "documents"
  | "awards"
  | "settings"
  | "unknown";

export interface AssistantPageContext {
  page: AssistantPageKind;
  pathname: string;
  label: string;
  summary?: string;
  opportunity_id?: string;
  agency_id?: string;
  uei?: string;
  meta?: Record<string, string | number | boolean | null>;
}

function searchParamRecord(
  searchParams: URLSearchParams | Record<string, string | undefined> | null | undefined,
): Record<string, string> {
  if (!searchParams) return {};
  if (searchParams instanceof URLSearchParams) {
    return Object.fromEntries(searchParams.entries());
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(searchParams)) {
    if (v != null && v !== "") out[k] = v;
  }
  return out;
}

export function derivePageContextFromPath(
  pathname: string,
  searchParams?: URLSearchParams | Record<string, string | undefined> | null,
): AssistantPageContext {
  const params = searchParamRecord(searchParams ?? null);

  if (pathname === "/explore") {
    return { page: "explore", pathname, label: "Explore" };
  }
  if (pathname === "/opportunities") {
    const lane = params["lane"];
    return {
      page: "opportunities_list",
      pathname,
      label: lane ? `Opportunities · ${lane}` : "All opportunities",
      meta: lane ? { lane } : undefined,
    };
  }
  const oppMatch = pathname.match(/^\/opportunities\/([^/]+)$/);
  if (oppMatch?.[1]) {
    return {
      page: "opportunity_detail",
      pathname,
      label: "Opportunity detail",
      opportunity_id: oppMatch[1],
    };
  }
  if (pathname === "/agencies") {
    return { page: "agency_list", pathname, label: "Agencies" };
  }
  if (pathname === "/entity") {
    return { page: "entity_lookup", pathname, label: "SAM entity lookup" };
  }
  if (pathname === "/watchlist") {
    return { page: "watchlist", pathname, label: "Pursuits" };
  }
  if (pathname === "/documents") {
    return { page: "documents", pathname, label: "Documents" };
  }
  if (pathname === "/awards") {
    return { page: "awards", pathname, label: "Contract awards" };
  }
  if (pathname === "/settings") {
    return { page: "settings", pathname, label: "Settings" };
  }

  return { page: "unknown", pathname, label: pathname || "Dashboard" };
}
