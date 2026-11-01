import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { isDatabaseConfigured } from "@/lib/db/supabase-admin";
import {
  findFirmsByEmailDomain,
  getFirmById,
  listMembershipsForEmail,
  upsertFirmMember,
  type FirmMembership,
} from "@/lib/firms/repository";
import type { FirmProfile, FirmRole } from "@/lib/firms/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const ACTIVE_FIRM_COOKIE = "sc_firm";

export interface SessionUser {
  id: string;
  email: string;
  isPlatformAdmin: boolean;
}

export interface FirmContext {
  user: SessionUser;
  firm: FirmProfile;
  role: FirmRole;
  memberships: FirmMembership[];
}

export type FirmContextResult =
  | { status: "unauthenticated" }
  | { status: "no_firm"; user: SessionUser }
  | { status: "unconfigured"; user: SessionUser }
  | ({ status: "ok" } & FirmContext);

export function getPlatformAdminEmails(): string[] {
  return (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformAdminEmail(email: string): boolean {
  return getPlatformAdminEmails().includes(email.toLowerCase());
}

function toSessionUser(user: User): SessionUser | null {
  if (!user.email) return null;
  const email = user.email.toLowerCase();
  return { id: user.id, email, isPlatformAdmin: isPlatformAdminEmail(email) };
}

/** Authenticated Supabase user for this request (deduped per request). */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return toSessionUser(user);
});

/**
 * Resolve the firm the current user is working in.
 * Order: `sc_firm` cookie (if the user may access it) → first membership →
 * auto-join a firm whose allowed_email_domains match the user's domain.
 * Platform admins may open any firm via the cookie.
 */
export const resolveFirmContext = cache(async (): Promise<FirmContextResult> => {
  const user = await getSessionUser();
  if (!user) return { status: "unauthenticated" };
  if (!isDatabaseConfigured()) return { status: "unconfigured", user };

  let memberships = await listMembershipsForEmail(user.email);

  if (memberships.length === 0) {
    const domainFirms = await findFirmsByEmailDomain(user.email);
    for (const firm of domainFirms) {
      await upsertFirmMember(firm.id, user.email, "member", "domain-auto-join", user.id);
    }
    if (domainFirms.length) memberships = await listMembershipsForEmail(user.email);
  }

  const cookieStore = await cookies();
  const preferred = cookieStore.get(ACTIVE_FIRM_COOKIE)?.value;

  const candidates: { firmId: string; role: FirmRole }[] = [];
  if (preferred) {
    const m = memberships.find((x) => x.firmId === preferred);
    if (m) candidates.push(m);
    else if (user.isPlatformAdmin) candidates.push({ firmId: preferred, role: "owner" });
  }
  candidates.push(...memberships);

  for (const candidate of candidates) {
    const firm = await getFirmById(candidate.firmId);
    if (!firm) continue;
    if (firm.status === "suspended" && !user.isPlatformAdmin) continue;
    return {
      status: "ok",
      user,
      firm,
      role: user.isPlatformAdmin ? "owner" : candidate.role,
      memberships,
    };
  }

  return { status: "no_firm", user };
});

/** For server components / pages. Redirects when there is no usable firm. */
export async function requireFirmPage(): Promise<FirmContext> {
  const ctx = await resolveFirmContext();
  switch (ctx.status) {
    case "ok":
      return ctx;
    case "unauthenticated":
      redirect("/login");
    case "unconfigured":
      redirect("/setup-required");
    case "no_firm":
      redirect("/onboarding");
  }
}

export async function requirePlatformAdminPage(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.isPlatformAdmin) redirect("/explore");
  return user;
}

const ROLE_RANK: Record<FirmRole, number> = { member: 1, admin: 2, owner: 3 };

export function hasRole(ctx: Pick<FirmContext, "role">, min: FirmRole): boolean {
  return ROLE_RANK[ctx.role] >= ROLE_RANK[min];
}

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/**
 * For API route handlers:
 *   const ctx = await requireFirmApi();
 *   if (ctx instanceof NextResponse) return ctx;
 */
export async function requireFirmApi(minRole: FirmRole = "member"): Promise<FirmContext | NextResponse> {
  const ctx = await resolveFirmContext();
  if (ctx.status === "unauthenticated") return jsonError(401, "Unauthorized");
  if (ctx.status === "unconfigured") return jsonError(503, "Database not configured");
  if (ctx.status === "no_firm") {
    return jsonError(403, "Your account is not attached to a firm. Ask an administrator to onboard your firm.");
  }
  if (!hasRole(ctx, minRole)) return jsonError(403, "Insufficient permissions");
  return ctx;
}

export async function requirePlatformAdminApi(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) return jsonError(401, "Unauthorized");
  if (!user.isPlatformAdmin) return jsonError(403, "Platform admin only");
  return user;
}
