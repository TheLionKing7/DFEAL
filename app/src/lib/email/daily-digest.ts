import { DFEAL_PROFILE } from "@/config/dfeal-profile";
import { listHotOpportunities } from "@/lib/db/opportunities";
import { buildDailyDigestHtml } from "@/lib/email/build-digest-html";

export interface SendDailyDigestResult {
  sent: boolean;
  skipped_reason?: string;
  recipient?: string;
  resend_id?: string;
}

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://dfeal.vercel.app"
  );
}

function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export async function sendDailyDigestEmail(options: {
  hotCount: number;
  scored: number;
  ingested: number;
}): Promise<SendDailyDigestResult> {
  const recipient =
    process.env.DIGEST_EMAIL_TO?.trim() || DFEAL_PROFILE.teamContactEmail;

  if (!isResendConfigured()) {
    return { sent: false, skipped_reason: "RESEND_API_KEY not configured" };
  }

  const hot = await listHotOpportunities(10);
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    `${DFEAL_PROFILE.productName} <onboarding@resend.dev>`;
  const exploreUrl = `${getSiteUrl()}/explore`;
  const subject = `${DFEAL_PROFILE.productName} — ${options.hotCount} hot opportunities (${new Date().toLocaleDateString("en-US")})`;
  const html = buildDailyDigestHtml({
    hotCount: options.hotCount,
    scored: options.scored,
    ingested: options.ingested,
    exploreUrl,
    opportunities: hot.map((opp) => ({
      title: opp.title,
      agency_name: opp.agency_name,
      naics: opp.naics,
      set_aside: opp.set_aside,
      response_deadline: opp.response_deadline,
      fit_score: opp.fit_score,
      go_no_go: opp.go_no_go,
      score_rationale: opp.score_rationale,
      sam_url: opp.sam_url,
    })),
  });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [recipient],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend API error (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as { id?: string };
  return {
    sent: true,
    recipient,
    resend_id: payload.id,
  };
}
