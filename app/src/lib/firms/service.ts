import { sendInviteEmail } from "@/lib/auth/sign-in-link";
import { SMART_CAPTURE } from "@/config/platform";
import { runScoringOnly } from "@/lib/cron/daily-pipeline";
import { logger } from "@/lib/logger";

/**
 * Score the current opportunity pool for one firm so a newly onboarded or
 * edited firm sees a populated feed immediately instead of waiting for cron.
 */
export async function rescoreFirm(firmId: string) {
  try {
    const [result] = await runScoringOnly({ firmId, limit: 1000 });
    logger.info("firm.rescored", { firmId, scored: result?.scored ?? 0 });
    return result ?? null;
  } catch (error) {
    logger.error("firm.rescore_failed", {
      firmId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Email a one-click sign-in link that drops the user into the firm workspace.
 * Membership (not the auth user) is what grants access.
 */
export async function sendAuthInvite(
  email: string,
  firmName?: string,
): Promise<"invited" | "exists" | "failed"> {
  const delivery = await sendInviteEmail({
    email,
    next: "/explore",
    subject: `You've been added to ${firmName ? `${firmName} on ` : ""}${SMART_CAPTURE.name}`,
    intro: `You've been added to ${firmName ? `the ${firmName} workspace on ` : ""}${SMART_CAPTURE.name}. Use the button below to sign in.`,
    cta: `Open ${SMART_CAPTURE.name}`,
  });
  return delivery === "email" ? "invited" : "failed";
}
