import { DFEAL_PROFILE } from "@/config/dfeal-profile";

type DigestOpportunity = {
  title: string;
  agency_name: string | null;
  naics: string | null;
  set_aside: string | null;
  response_deadline: string | null;
  fit_score: number | null;
  go_no_go: string | null;
  score_rationale: string | null;
  sam_url: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(value: string | null): string {
  if (!value) return "TBD";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function buildDailyDigestHtml(options: {
  hotCount: number;
  scored: number;
  ingested: number;
  opportunities: DigestOpportunity[];
  exploreUrl: string;
}): string {
  const { hotCount, scored, ingested, opportunities, exploreUrl } = options;
  const rows = opportunities
    .map((opp) => {
      const link = opp.sam_url
        ? `<a href="${escapeHtml(opp.sam_url)}" style="color:#c9a84c">SAM.gov</a>`
        : "";
      return `
        <tr>
          <td style="padding:12px 8px;border-bottom:1px solid #e2e8f0">
            <strong>${escapeHtml(opp.title)}</strong><br/>
            <span style="color:#64748b;font-size:13px">
              ${escapeHtml(opp.agency_name ?? "Agency TBD")}
              ${opp.naics ? ` · NAICS ${escapeHtml(opp.naics)}` : ""}
              ${opp.set_aside ? ` · ${escapeHtml(opp.set_aside)}` : ""}
              · Due ${formatDate(opp.response_deadline)}
            </span>
            ${
              opp.score_rationale
                ? `<br/><span style="color:#64748b;font-size:12px">${escapeHtml(opp.score_rationale)}</span>`
                : ""
            }
          </td>
          <td style="padding:12px 8px;border-bottom:1px solid #e2e8f0;text-align:center;white-space:nowrap">
            ${opp.fit_score ?? "—"}
          </td>
          <td style="padding:12px 8px;border-bottom:1px solid #e2e8f0;text-align:center;text-transform:uppercase;font-size:12px">
            ${escapeHtml((opp.go_no_go ?? "—").replace("_", " "))}
          </td>
          <td style="padding:12px 8px;border-bottom:1px solid #e2e8f0;text-align:center">${link}</td>
        </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f7f6f3;font-family:system-ui,sans-serif;color:#1a2332">
  <div style="max-width:640px;margin:0 auto;padding:32px 16px">
    <div style="background:#0f2744;color:#fff;padding:24px;border-radius:12px 12px 0 0">
      <p style="margin:0;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#c9a84c">Daily digest</p>
      <h1 style="margin:8px 0 0;font-size:22px">${escapeHtml(DFEAL_PROFILE.productName)}</h1>
    </div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px">
      <p style="margin:0 0 16px">
        <strong>${hotCount}</strong> hot opportunities ·
        <strong>${scored}</strong> scored ·
        <strong>${ingested}</strong> ingested from SAM.gov
      </p>
      ${
        opportunities.length === 0
          ? `<p style="color:#64748b">No hot opportunities in today's batch. Open the platform to review the full feed.</p>`
          : `<table style="width:100%;border-collapse:collapse;font-size:14px">
              <thead>
                <tr style="background:#f8fafc">
                  <th style="padding:8px;text-align:left">Opportunity</th>
                  <th style="padding:8px">Score</th>
                  <th style="padding:8px">Go/No-go</th>
                  <th style="padding:8px">Link</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>`
      }
      <p style="margin:24px 0 0">
        <a href="${escapeHtml(exploreUrl)}" style="display:inline-block;background:#0f2744;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">
          Open DFEAL Capture →
        </a>
      </p>
    </div>
    <p style="margin:16px 0 0;font-size:12px;color:#64748b;text-align:center">
      ${escapeHtml(DFEAL_PROFILE.legalName)} · Internal use only
    </p>
  </div>
</body>
</html>`;
}
