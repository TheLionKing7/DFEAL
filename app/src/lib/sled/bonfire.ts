import { warmCookieJar, sledFetch } from "@/lib/sled/http";
import {
  matchesDfealSledKeywords,
  parseSledDate,
  sledOpportunityId,
} from "@/lib/sled/normalize";
import type { SledFetchOptions, SledFetchResult } from "@/lib/sled/types";
import type { Opportunity } from "@/shared/types/opportunity";

interface BonfireProject {
  ProjectID: string;
  PrivateProjectID: string;
  ReferenceID: string;
  ProjectName: string;
  DateClose: string;
  DepartmentID: string;
}

interface BonfirePortalPayload {
  success: number;
  payload?: {
    projects: Record<string, BonfireProject>;
    departments: Record<string, { DepartmentName: string }>;
  };
}

function portalBaseUrl(portalUrl: string): string {
  return portalUrl.replace(/\/$/, "");
}

function inferMarketTier(portalUrl: string, orgName: string): "local" | "education" {
  const hay = `${portalUrl} ${orgName}`.toLowerCase();
  if (/u-46|school|district|education|k12|k-12|isd|unified/.test(hay)) {
    return "education";
  }
  return "local";
}

function inferNoticeType(title: string): Opportunity["notice_type"] {
  const t = title.toLowerCase();
  if (/rfp|request for proposal/.test(t)) return "solicitation";
  if (/rfi|sources sought/.test(t)) return "sources_sought";
  if (/ifb|invitation for bid/.test(t)) return "solicitation";
  return "solicitation";
}

function normalizeBonfireProject(
  portalUrl: string,
  orgName: string,
  project: BonfireProject,
  departmentName?: string,
): Opportunity {
  const base = portalBaseUrl(portalUrl);
  const marketTier = inferMarketTier(portalUrl, orgName);
  const now = new Date().toISOString();

  return {
    id: sledOpportunityId("bonfire", `${new URL(base).hostname}-${project.ReferenceID}`),
    source: "bonfire",
    external_id: `${new URL(base).hostname}-${project.ReferenceID}`,
    notice_type: inferNoticeType(project.ProjectName),
    title: project.ProjectName,
    description: [
      project.ProjectName,
      departmentName ? `Department: ${departmentName}` : "",
      `Reference: ${project.ReferenceID}`,
      `Portal: ${orgName}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    agency_id: null,
    agency_name: orgName,
    naics: null,
    psc: null,
    set_aside: null,
    place_of_performance: { state: "IL", country: "US" },
    estimated_value_usd: null,
    response_deadline: parseSledDate(project.DateClose),
    posted_date: null,
    updated_at: now,
    status: "active",
    archived_at: null,
    sam_url: null,
    source_url: `${base}/opportunities/${project.ProjectID}`,
    raw_data: {
      market_tier: marketTier,
      portal_url: base,
      project_id: project.ProjectID,
      reference_id: project.ReferenceID,
      department: departmentName,
    },
  };
}

async function fetchBonfirePortal(
  portalUrl: string,
  limit: number,
): Promise<{ orgName: string; opportunities: Opportunity[] }> {
  const base = portalBaseUrl(portalUrl);
  const jar = new Map<string, string>();
  await warmCookieJar(`${base}/`, jar);

  const pageRes = await sledFetch(`${base}/opportunities`, { cookieJar: jar });
  if (!pageRes.ok) {
    throw new Error(`Bonfire portal HTTP ${pageRes.status} for ${base}`);
  }

  const pageHtml = await pageRes.text();
  const orgMatch = pageHtml.match(/<title>([^<]+)<\/title>/i);
  const orgName = orgMatch?.[1]?.trim() || new URL(base).hostname;

  const dataRes = await sledFetch(
    `${base}/PublicPortal/getOpenPublicOpportunitiesSectionData`,
    {
      cookieJar: jar,
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        Referer: `${base}/opportunities`,
      },
    },
  );

  if (!dataRes.ok) {
    throw new Error(`Bonfire section data HTTP ${dataRes.status} for ${base}`);
  }

  const data = (await dataRes.json()) as BonfirePortalPayload;
  const projects = Object.values(data.payload?.projects ?? {});
  const departments = data.payload?.departments ?? {};

  const opportunities = projects
    .filter((p) => matchesDfealSledKeywords(p.ProjectName))
    .slice(0, limit)
    .map((p) =>
      normalizeBonfireProject(
        base,
        orgName,
        p,
        departments[p.DepartmentID]?.DepartmentName,
      ),
    );

  return { orgName, opportunities };
}

export async function fetchBonfireOpportunities(
  options: SledFetchOptions = {},
): Promise<SledFetchResult> {
  const configured =
    process.env.BONFIRE_PORTALS?.split(",")
      .map((p) => p.trim())
      .filter(Boolean) ?? [];

  const portals =
    configured.length > 0
      ? configured
      : [
          "https://transitchicago.bonfirehub.com",
          "https://u-46.bonfirehub.com",
        ];

  const limit = options.limit ?? 60;
  const perPortal = Math.ceil(limit / portals.length);
  const merged: Opportunity[] = [];
  const errors: string[] = [];

  for (const portal of portals) {
    try {
      const { opportunities } = await fetchBonfirePortal(portal, perPortal);
      merged.push(...opportunities);
    } catch (err) {
      const message = err instanceof Error ? err.message : `${portal} failed`;
      errors.push(message);
    }
  }

  return {
    source: "bonfire",
    fetched: merged.length,
    opportunities: merged.slice(0, limit),
    message:
      merged.length > 0
        ? `Bonfire: ${merged.length} open projects across ${portals.length} portal(s)`
        : errors.join("; ") || "Bonfire: no projects ingested",
  };
}

export const BONFIRE_CONNECTOR_META = {
  id: "bonfire" as const,
  name: "Bonfire",
  marketTier: "local" as const,
  phase: 3 as const,
  status: "live" as const,
  description: "Municipal and school district Bonfire procurement portals",
};
