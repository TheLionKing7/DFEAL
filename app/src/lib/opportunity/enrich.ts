import type { Opportunity } from "@/shared/types/opportunity";

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface EnrichedOpportunityDetails {
  description: string | null;
  synopsis: string | null;
  placeLabel: string | null;
  contacts: { name: string; email: string | null; phone: string | null }[];
  resourceLinks: { label: string; url: string }[];
  noticeType: string | null;
  department: string | null;
}

export function enrichOpportunityDetails(opp: Opportunity): EnrichedOpportunityDetails {
  const raw = opp.raw_data ?? {};

  const description =
    opp.description ??
    asString(raw.description) ??
    asString(raw.solicitationDescription) ??
    asString(raw.summary) ??
    (typeof raw.description === "string" ? stripHtml(raw.description) : null);

  const synopsis =
    asString(raw.synopsis) ??
    asString(raw.additionalInfoText) ??
    asString(raw.esourceDescription);

  const pop = raw.placeOfPerformance ?? raw.place_of_performance ?? opp.place_of_performance;
  let placeLabel: string | null = null;
  if (pop && typeof pop === "object") {
    const p = pop as Record<string, unknown>;
    const parts = [p.city, p.state, p.country, p.zip, p.countryCode]
      .filter((x) => typeof x === "string" && x.trim())
      .map(String);
    if (parts.length) placeLabel = parts.join(", ");
  }

  const contacts: EnrichedOpportunityDetails["contacts"] = [];
  const pocList = Array.isArray(raw.pointOfContact)
    ? raw.pointOfContact
    : raw.pointOfContact
      ? [raw.pointOfContact]
      : [];

  for (const poc of pocList) {
    if (!poc || typeof poc !== "object") continue;
    const row = poc as Record<string, unknown>;
    const name = asString(row.fullName) ?? asString(row.name);
    if (!name) continue;
    contacts.push({
      name,
      email: asString(row.email),
      phone: asString(row.phone),
    });
  }

  const resourceLinks: EnrichedOpportunityDetails["resourceLinks"] = [];
  const links = Array.isArray(raw.resourceLinks) ? raw.resourceLinks : [];
  for (const link of links) {
    if (!link || typeof link !== "object") continue;
    const row = link as Record<string, unknown>;
    const url = asString(row.url) ?? asString(row.href);
    if (!url) continue;
    resourceLinks.push({
      label: asString(row.description) ?? asString(row.type) ?? "Attachment",
      url,
    });
  }

  if (opp.sam_url) {
    resourceLinks.unshift({ label: "SAM.gov notice", url: opp.sam_url });
  } else if (opp.source_url) {
    resourceLinks.unshift({ label: "Source portal", url: opp.source_url });
  }

  return {
    description: description ? stripHtml(description) : null,
    synopsis,
    placeLabel,
    contacts,
    resourceLinks,
    noticeType: asString(raw.type) ?? asString(raw.noticeType) ?? opp.notice_type,
    department: asString(raw.fullParentPathName) ?? asString(raw.departmentName),
  };
}
