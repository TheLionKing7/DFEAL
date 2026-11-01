import { runScoringOnly } from "@/lib/cron/daily-pipeline";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { getSiteUrl } from "@/lib/env";
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
 * Create the Supabase auth user (if needed) and email an invite link.
 * Existing users simply sign in with a magic link — membership is what grants access.
 */
export async function sendAuthInvite(email: string): Promise<"invited" | "exists" | "failed"> {
  try {
    const { error } = await getSupabaseAdmin().auth.admin.inviteUserByEmail(email, {
      redirectTo: `${getSiteUrl()}/auth/callback?next=/explore`,
    });
    if (!error) return "invited";
    if (/already (been )?registered|already exists/i.test(error.message)) return "exists";
    logger.warn("firm.invite_failed", { error: error.message });
    return "failed";
  } catch (error) {
    logger.warn("firm.invite_failed", { error: error instanceof Error ? error.message : String(error) });
    return "failed";
  }
}
