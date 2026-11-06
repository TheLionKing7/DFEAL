import type { FirmRow, Json } from "@/lib/db/database.types";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import {
  DEFAULT_GO_NO_GO,
  DEFAULT_WORKSPACE,
  type FirmProfile,
  type WorkspaceSettings,
  type FirmRole,
  type GoNoGoRules,
  type PastPerformanceRecord,
} from "@/lib/firms/types";
import type { ValidFirmInput } from "@/lib/firms/validation";

export function rowToFirm(row: FirmRow): FirmProfile {
  const goNoGo = (row.go_no_go ?? {}) as Partial<GoNoGoRules>;
  return {
    id: row.id,
    slug: row.slug,
    status: row.status === "suspended" ? "suspended" : "active",
    legalName: row.legal_name,
    shortName: row.short_name,
    dbaName: row.dba_name ?? null,
    entityType: row.entity_type ?? null,
    employeeRange: row.employee_range ?? null,
    uei: row.uei,
    cage: row.cage,
    duns: row.duns,
    samStatus: (["active", "expired", "inactive"].includes(row.sam_status)
      ? row.sam_status
      : "unknown") as FirmProfile["samStatus"],
    samExpirationDate: row.sam_expiration_date,
    industry: row.industry,
    primaryNaics: row.primary_naics,
    naicsCodes: row.naics_codes?.length ? row.naics_codes : [row.primary_naics],
    pscCodes: row.psc_codes ?? [],
    keywords: row.keywords ?? [],
    setAsides: row.set_asides ?? [],
    certifications: row.certifications ?? [],
    homeState: row.home_state?.trim() || null,
    targetStates: row.target_states ?? [],
    capabilityStatement: row.capability_statement ?? "",
    coreCompetencies: row.core_competencies ?? [],
    differentiators: row.differentiators ?? [],
    pastPerformance: Array.isArray(row.past_performance)
      ? (row.past_performance as unknown as PastPerformanceRecord[])
      : [],
    goNoGo: { ...DEFAULT_GO_NO_GO, ...goNoGo },
    contactEmail: row.contact_email,
    phone: row.phone,
    website: row.website,
    address: row.address,
    assistantName: row.assistant_name || `${row.short_name}'s Assistant`,
    allowedEmailDomains: row.allowed_email_domains ?? [],
    digestRecipients: row.digest_recipients ?? [],
    workspace: { ...DEFAULT_WORKSPACE, ...((row.workspace ?? {}) as Partial<WorkspaceSettings>) },
    onboardedAt: row.onboarded_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function inputToRow(input: ValidFirmInput) {
  return {
    legal_name: input.legalName,
    short_name: input.shortName,
    uei: input.uei,
    cage: input.cage,
    duns: input.duns,
    industry: input.industry,
    primary_naics: input.primaryNaics,
    naics_codes: input.naicsCodes,
    psc_codes: input.pscCodes,
    keywords: input.keywords.map((k) => k.toLowerCase()),
    set_asides: input.setAsides,
    certifications: input.certifications,
    home_state: input.homeState,
    target_states: input.targetStates,
    capability_statement: input.capabilityStatement,
    core_competencies: input.coreCompetencies,
    differentiators: input.differentiators,
    past_performance: input.pastPerformance as unknown as Json,
    go_no_go: input.goNoGo as unknown as Json,
    contact_email: input.contactEmail,
    phone: input.phone,
    website: input.website,
    address: input.address,
    assistant_name: input.assistantName,
    allowed_email_domains: input.allowedEmailDomains,
    digest_recipients: input.digestRecipients,
    dba_name: input.dbaName,
    entity_type: input.entityType,
    employee_range: input.employeeRange,
    workspace: input.workspace as unknown as Json,
  };
}

export async function getFirmById(id: string): Promise<FirmProfile | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("firms")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToFirm(data) : null;
}

export async function getFirmBySlug(slug: string): Promise<FirmProfile | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("firms")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToFirm(data) : null;
}

export async function listFirms(options?: { activeOnly?: boolean }): Promise<FirmProfile[]> {
  let query = getSupabaseAdmin().from("firms").select("*").order("legal_name");
  if (options?.activeOnly) query = query.eq("status", "active");
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToFirm);
}

export async function createFirm(
  input: ValidFirmInput & { slug: string },
  createdBy: string,
  owner?: { email: string },
): Promise<FirmProfile> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("firms")
    .insert({ ...inputToRow(input), slug: input.slug, created_by: createdBy })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") throw new Error(`A firm with slug "${input.slug}" already exists`);
    throw new Error(error.message);
  }
  const firm = rowToFirm(data);
  if (owner) await upsertFirmMember(firm.id, owner.email, "owner", createdBy);
  return firm;
}

export async function updateFirm(id: string, input: ValidFirmInput): Promise<FirmProfile> {
  const { data, error } = await getSupabaseAdmin()
    .from("firms")
    .update(inputToRow(input))
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToFirm(data);
}

export async function setFirmStatus(id: string, status: "active" | "suspended") {
  const { error } = await getSupabaseAdmin().from("firms").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export interface FirmMembership {
  firmId: string;
  email: string;
  role: FirmRole;
  userId: string | null;
}

export interface FirmMemberRow {
  id: string;
  email: string;
  role: FirmRole;
  user_id: string | null;
  created_at: string;
}

export async function listMembershipsForEmail(email: string): Promise<FirmMembership[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("firm_members")
    .select("firm_id, email, role, user_id")
    .eq("email", email.toLowerCase());
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    firmId: r.firm_id,
    email: r.email,
    role: r.role as FirmRole,
    userId: r.user_id,
  }));
}

/** Record the auth user id on memberships the first time the user signs in. */
export async function linkMembershipsToUser(email: string, userId: string) {
  await getSupabaseAdmin()
    .from("firm_members")
    .update({ user_id: userId })
    .eq("email", email.toLowerCase())
    .is("user_id", null);
}

/** Firms whose allowed_email_domains include the user's domain (auto-join as member). */
export async function findFirmsByEmailDomain(email: string): Promise<FirmProfile[]> {
  const domain = email.toLowerCase().split("@")[1];
  if (!domain) return [];
  const { data, error } = await getSupabaseAdmin()
    .from("firms")
    .select("*")
    .eq("status", "active")
    .contains("allowed_email_domains", [domain]);
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToFirm);
}

export async function listFirmMembers(firmId: string): Promise<FirmMemberRow[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("firm_members")
    .select("id, email, role, user_id, created_at")
    .eq("firm_id", firmId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ ...r, role: r.role as FirmRole }));
}

export async function upsertFirmMember(
  firmId: string,
  email: string,
  role: FirmRole,
  invitedBy?: string,
  userId?: string,
) {
  const { error } = await getSupabaseAdmin()
    .from("firm_members")
    .upsert(
      {
        firm_id: firmId,
        email: email.toLowerCase(),
        role,
        invited_by: invitedBy ?? null,
        ...(userId ? { user_id: userId } : {}),
      },
      { onConflict: "firm_id,email" },
    );
  if (error) throw new Error(error.message);
}

export async function removeFirmMember(firmId: string, email: string) {
  const { error } = await getSupabaseAdmin()
    .from("firm_members")
    .delete()
    .eq("firm_id", firmId)
    .eq("email", email.toLowerCase());
  if (error) throw new Error(error.message);
}

export async function countFirmOwners(firmId: string): Promise<number> {
  const { count, error } = await getSupabaseAdmin()
    .from("firm_members")
    .select("id", { count: "exact", head: true })
    .eq("firm_id", firmId)
    .eq("role", "owner");
  if (error) throw new Error(error.message);
  return count ?? 0;
}
