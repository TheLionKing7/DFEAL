import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { isDatabaseConfigured } from "@/lib/db/supabase-admin";
import { ACTIVE_FIRM_COOKIE, getSessionUser, resolveFirmContext } from "@/lib/firms/context";
import { createFirm, getFirmBySlug, upsertFirmMember } from "@/lib/firms/repository";
import { rescoreFirm, sendAuthInvite } from "@/lib/firms/service";
import { firmInputSchema, formatValidationErrors, slugify } from "@/lib/firms/validation";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { badRequest, readJson, serverError } from "@/lib/http/json";
import { logger } from "@/lib/logger";
import { getPendingInvitation, markInvitationAccepted } from "@/lib/onboarding/invitations";
import { profileInputSchema, upsertUserProfile } from "@/lib/onboarding/profile";

export const maxDuration = 120;

const teammateSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(["admin", "member"]).default("member"),
});

/**
 * Complete invite-only onboarding: personal profile + business profile +
 * workspace setup + optional teammates. The signed-in user becomes owner.
 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const [invitation, ctx] = await Promise.all([getPendingInvitation(user.email), resolveFirmContext()]);
  const selfServe = process.env.ALLOW_SELF_SIGNUP === "1" && ctx.status === "no_firm";
  if (!invitation && !user.isPlatformAdmin && !selfServe) {
    return NextResponse.json(
      { error: "Smart Capture is invite-only. Ask your Smart Capture contact for an invitation." },
      { status: 403 },
    );
  }

  const body = await readJson<{ profile?: unknown; firm?: unknown; teammates?: unknown }>(request);
  if (!body) return badRequest("Invalid JSON body");

  const profile = profileInputSchema.safeParse(body.profile ?? {});
  const firm = firmInputSchema
    .refine((f) => Boolean(f.homeState), { message: "Choose your home or preferred working state", path: ["homeState"] })
    .safeParse(body.firm ?? {});
  const teammates = z.array(teammateSchema).max(25).default([]).safeParse(body.teammates ?? []);
  if (!profile.success || !firm.success || !teammates.success) {
    return badRequest("Validation failed", {
      ...(profile.success ? {} : prefix("profile", formatValidationErrors(profile.error))),
      ...(firm.success ? {} : formatValidationErrors(firm.error)),
      ...(teammates.success ? {} : prefix("teammates", formatValidationErrors(teammates.error))),
    });
  }

  try {
    await upsertUserProfile(user.email, user.id, profile.data);

    const base = firm.data.slug ?? slugify(firm.data.legalName);
    let slug = base;
    for (let i = 2; await getFirmBySlug(slug); i += 1) slug = `${base}-${i}`.slice(0, 49);

    const created = await createFirm(
      {
        ...firm.data,
        slug,
        contactEmail: firm.data.contactEmail ?? user.email,
        digestRecipients: firm.data.digestRecipients.length ? firm.data.digestRecipients : [user.email],
      },
      user.email,
      { email: user.email },
    );
    await getSupabaseAdmin().from("firms").update({ onboarded_at: new Date().toISOString() }).eq("id", created.id);
    if (invitation) await markInvitationAccepted(invitation.id, created.id);

    const invites: { email: string; result: string }[] = [];
    for (const t of teammates.data.filter((t) => t.email !== user.email)) {
      await upsertFirmMember(created.id, t.email, t.role, user.email);
      invites.push({ email: t.email, result: await sendAuthInvite(t.email, created.shortName) });
    }

    const scoring = await rescoreFirm(created.id);
    logger.info("onboarding.completed", { firmId: created.id, slug, by: user.email, invited: invites.length });

    (await cookies()).set(ACTIVE_FIRM_COOKIE, created.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return NextResponse.json({ ok: true, firm: created, invites, scored: scoring?.scored ?? 0 }, { status: 201 });
  } catch (error) {
    return serverError("api.onboarding.failed", error, "Could not create your workspace");
  }
}

function prefix(p: string, errors: Record<string, string>) {
  return Object.fromEntries(Object.entries(errors).map(([k, v]) => [`${p}.${k}`, v]));
}
