import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isDatabaseConfigured } from "@/lib/db/supabase-admin";
import { ACTIVE_FIRM_COOKIE, getSessionUser, resolveFirmContext } from "@/lib/firms/context";
import { createFirm, getFirmBySlug } from "@/lib/firms/repository";
import { rescoreFirm, sendAuthInvite } from "@/lib/firms/service";
import { firmInputSchema, formatValidationErrors, slugify } from "@/lib/firms/validation";
import { badRequest, readJson, serverError } from "@/lib/http/json";
import { logger } from "@/lib/logger";

export const maxDuration = 120;

/**
 * Onboard a firm.
 *  - Platform admins can onboard any firm and name an owner by email.
 *  - When ALLOW_SELF_SIGNUP=1, a signed-in user with no firm can onboard their own.
 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  if (!user.isPlatformAdmin) {
    const ctx = await resolveFirmContext();
    const selfServe = process.env.ALLOW_SELF_SIGNUP === "1" && ctx.status === "no_firm";
    if (!selfServe) {
      return NextResponse.json({ error: "Only platform administrators can onboard firms" }, { status: 403 });
    }
  }

  const body = await readJson<Record<string, unknown> & { ownerEmail?: string }>(request);
  if (!body) return badRequest("Invalid JSON body");

  const parsed = firmInputSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed", formatValidationErrors(parsed.error));

  const ownerEmail = user.isPlatformAdmin
    ? body.ownerEmail?.trim().toLowerCase() || user.email
    : user.email;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
    return badRequest("Validation failed", { ownerEmail: "Invalid owner email" });
  }

  try {
    // Pick a unique slug (acme, acme-2, …)
    const base = parsed.data.slug ?? slugify(parsed.data.legalName);
    let slug = base;
    for (let i = 2; await getFirmBySlug(slug); i += 1) slug = `${base}-${i}`.slice(0, 49);

    const firm = await createFirm({ ...parsed.data, slug }, user.email, { email: ownerEmail });
    logger.info("firm.created", { firmId: firm.id, slug, by: user.email });

    const invite = ownerEmail !== user.email ? await sendAuthInvite(ownerEmail, firm.shortName) : "exists";
    const scoring = await rescoreFirm(firm.id);

    // Drop the creator into the new workspace.
    (await cookies()).set(ACTIVE_FIRM_COOKIE, firm.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return NextResponse.json({ ok: true, firm, owner: ownerEmail, invite, scored: scoring?.scored ?? 0 }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("already exists")) return badRequest(error.message);
    return serverError("api.firms.create_failed", error, "Could not create firm");
  }
}
