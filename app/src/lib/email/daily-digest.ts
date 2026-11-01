import { SMART_CAPTURE } from "@/config/platform";
import { listHotOpportunities } from "@/lib/db/opportunities";
import { buildDailyDigestHtml } from "@/lib/email/build-digest-html";
import { getSiteUrl } from "@/lib/env";
import type { FirmProfile } from "@/lib/firms/types";

export interface SendDailyDigestResult {
  sent: boolean;
  skipped_reason?: string;
  recipients?: string[];
  resend_id?: string;
}

function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/** Recipients: firm digest list → firm contact email. */
export function digestRecipientsFor(firm: FirmProfile): string[] {
  if (firm.digestRecipients.length) return firm.digestRecipients;
  return firm.contactEmail ? [firm.contactEmail] : [];
}

export async function sendDailyDigestEmail(
  firm: FirmProfile,
  options: { hotCount: number; scored: number; ingested: number },
): Promise<SendDailyDigestResult> {
  if (!isResendConfigured()) {
    return { sent: false, skipped_reason: "RESEND_API_KEY not configured" };
  }
  const recipients = digestRecipientsFor(firm);
  if (recipients.length === 0) {
    return { sent: false, skipped_reason: "No digest recipients configured for firm" };
  }

  const hot = await listHotOpportunities(firm.id, 10);
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() || `${SMART_CAPTURE.name} <onboarding@resend.dev>`;
  const exploreUrl = `${getSiteUrl()}/explore`;
  const subject = `${SMART_CAPTURE.name} · ${firm.shortName} — ${options.hotCount} hot opportunities (${new Date().toLocaleDateString("en-US")})`;
  const html = buildDailyDigestHtml({
    hotCount: options.hotCount,
    scored: options.scored,
    ingested: options.ingested,
    exploreUrl,
    firmName: firm.legalName,
    opportunities: hot.map((opp) => ({
      title: opp.title,
      agency_name: opp.agency_name,
      naics: opp.naics,
      set_aside: opp.set_aside,
      response_deadline: opp.response_deadline,
      fit_score: opp.fit_score ?? null,
      go_no_go: opp.go_no_go ?? null,
      score_rationale: opp.score_rationale ?? null,
      sam_url: opp.sam_url ?? opp.source_url ?? null,
    })),
  });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: recipients, subject, html }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend API error (${response.status}): ${body.slice(0, 300)}`);
  }

  const payload = (await response.json()) as { id?: string };
  return { sent: true, recipients, resend_id: payload.id };
}
