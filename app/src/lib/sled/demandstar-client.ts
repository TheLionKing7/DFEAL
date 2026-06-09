import { createHash } from "crypto";

const AUTH_BASE = "https://api.demandstar.com/auth/access/v1";
/** Supplier bid search uses the contents API base (not /contract/api). */
const BIDS_API = "https://api.demandstar.com/contents/content/v1";
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

function stripEmptyFields(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (value === "" || value === null || value === undefined || value === false) continue;
    out[key] = value;
  }
  return out;
}

async function readJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(`DemandStar returned empty response (${res.status})`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`DemandStar returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }
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

  const data = await readJsonResponse<DemandStarAuthResult & { error?: string }>(res);
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
  const body = stripEmptyFields({
    showBids: filters.commodityMatches ? "Commodity" : "",
    filterOrdered: false,
    states: filters.states?.length ? filters.states.join(",") : "",
    bidStatus: filters.bidStatus ?? "AC",
    commodityMatches: filters.commodityMatches ?? false,
    sortBy: filters.sortBy ?? "broadCastDate",
    sortOrder: filters.sortOrder ?? "DESC",
    bidscurrentPage: filters.bidscurrentPage ?? 1,
    commodityExists: false,
    initialRequest: filters.initialRequest ?? false,
    preserveFilters: false,
  });

  const res = await fetch(`${BIDS_API}/bids/search`, {
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

  const payload = await readJsonResponse<
    DemandStarSearchResponse & {
      data?: DemandStarSearchResponse;
      error?: string;
      message?: string;
      errors?: Record<string, string[]>;
      title?: string;
    }
  >(res);

  if (!res.ok) {
    const detail =
      payload.title ??
      payload.message ??
      payload.error ??
      (payload.errors ? JSON.stringify(payload.errors) : undefined);
    throw new Error(detail ?? `DemandStar bid search failed (${res.status})`);
  }

  return payload.data ?? payload;
}

export function demandStarBidUrl(bidId: number | string): string {
  return `${APP_BASE}/suppliers/bids/${bidId}`;
}
