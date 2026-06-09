import { createHash } from "crypto";

const AUTH_BASE = "https://api.demandstar.com/auth/access/v1";
const CONTRACT_API = "https://api.demandstar.com/contract/api";
const APP_BASE = "https://www.demandstar.com/app";

export interface DemandStarAuthResult {
  token: string;
  errorMessage?: string;
  hasError?: boolean;
}

export interface DemandStarBidRow {
  bidId: number | string;
  bidIdentifier?: string;
  bidName?: string;
  agency?: string;
  broadCastDate?: string;
  dueDate?: string;
  dueDateTime?: string;
  state?: string;
  stateName?: string;
  agencyState?: string;
  governmentType?: string;
  statusType?: string;
  statusName?: string;
  [key: string]: unknown;
}

export interface DemandStarSearchResponse {
  result?: DemandStarBidRow[];
  total?: number;
  parameters?: Record<string, unknown>;
}

function hashPassword(userName: string, password: string): string {
  const input = `${userName.toUpperCase()}${password}`;
  return createHash("md5").update(input).digest("hex");
}

export async function demandStarLogin(
  userName: string,
  password: string,
): Promise<DemandStarAuthResult> {
  const hashed = hashPassword(userName, password);
  const res = await fetch(`${AUTH_BASE}/auth/gettoken`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    body: JSON.stringify({
      Expiration: 24,
      IsAnonymous: false,
      Password: hashed,
      UserName: userName,
      Hashed: true,
    }),
  });

  const data = (await res.json()) as DemandStarAuthResult & { error?: string };
  if (!res.ok) {
    throw new Error(data.errorMessage ?? data.error ?? `DemandStar login failed (${res.status})`);
  }
  if (data.hasError || data.errorMessage) {
    throw new Error(data.errorMessage ?? "DemandStar login failed");
  }
  if (!data.token?.trim()) {
    throw new Error("DemandStar login returned no token");
  }
  return data;
}

export interface DemandStarSearchFilters {
  bidStatus?: string;
  states?: string[];
  commodityMatches?: boolean;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
  bidscurrentPage?: number;
  initialRequest?: boolean;
}

export async function demandStarSearchBids(
  token: string,
  filters: DemandStarSearchFilters = {},
): Promise<DemandStarSearchResponse> {
  const body: Record<string, unknown> = {
    showBids: filters.commodityMatches ? "Commodity" : "",
    filterOrdered: false,
    location: "",
    locationType: "",
    radius: "",
    industry: "",
    states: filters.states?.length ? filters.states.join(",") : "",
    bidStatus: filters.bidStatus ?? "AC",
    bidIdentifier: "",
    fiscalYear: "",
    bidName: "",
    agencyMemberId: "",
    dueDateTime: "",
    startDueDate: "",
    endDueDate: "",
    myBids: false,
    includeExternalBids: false,
    bidsNotified: false,
    orderedBids: false,
    watchedBids: false,
    commodityMatches: filters.commodityMatches ?? false,
    ebiddingAvailable: false,
    sortBy: filters.sortBy ?? "broadCastDate",
    sortOrder: filters.sortOrder ?? "DESC",
    bidscurrentPage: filters.bidscurrentPage ?? 1,
    commodityExists: false,
    initialRequest: filters.initialRequest ?? false,
    preserveFilters: false,
  };

  const res = await fetch(`${CONTRACT_API}/bids/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    body: JSON.stringify(body),
  });

  const payload = (await res.json()) as { data?: DemandStarSearchResponse; error?: string; message?: string };
  if (!res.ok) {
    throw new Error(payload.message ?? payload.error ?? `DemandStar bid search failed (${res.status})`);
  }

  return payload.data ?? (payload as unknown as DemandStarSearchResponse);
}

export function demandStarBidUrl(bidId: number | string): string {
  return `${APP_BASE}/suppliers/bids/${bidId}`;
}
