import type { ConnectorRow, Json } from "@/lib/db/database.types";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { getSiteUrl } from "@/lib/env";
import { decryptJson, encryptJson } from "@/lib/security/crypto";
import type { ConnectorSecret, ConnectorType, ConnectorView } from "@/lib/connectors/types";

export interface ConnectorRecord extends ConnectorView {
  firm_id: string;
  secret: ConnectorSecret | null;
}

export function toView(row: ConnectorRow): ConnectorView {
  const config = (row.config ?? {}) as ConnectorView["config"] & { token?: string };
  const { token, ...rest } = config;
  return {
    id: row.id,
    type: row.type as ConnectorType,
    name: row.name,
    status: row.status as ConnectorView["status"],
    config: {
      ...rest,
      ...(row.type === "calendar_feed" && token ? { feedUrl: `${getSiteUrl()}/api/calendar/${token}.ics` } : {}),
    },
    last_tested_at: row.last_tested_at,
    last_error: row.last_error,
    created_by: row.created_by,
    created_at: row.created_at,
  };
}

function toRecord(row: ConnectorRow): ConnectorRecord {
  return {
    ...toView(row),
    firm_id: row.firm_id,
    secret: row.secret_enc ? decryptJson<ConnectorSecret>(row.secret_enc) : null,
  };
}

export async function listConnectors(firmId: string): Promise<ConnectorView[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("connectors")
    .select("*")
    .eq("firm_id", firmId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map(toView);
}

export async function getConnector(firmId: string, id: string): Promise<ConnectorRecord | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("connectors")
    .select("*")
    .eq("firm_id", firmId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toRecord(data) : null;
}

export async function listConnectorRecords(firmId: string, types?: ConnectorType[]): Promise<ConnectorRecord[]> {
  let q = getSupabaseAdmin().from("connectors").select("*").eq("firm_id", firmId).neq("status", "disabled");
  if (types?.length) q = q.in("type", types);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map(toRecord);
}

export async function insertConnector(input: {
  firmId: string;
  type: ConnectorType;
  name: string;
  config: Record<string, unknown>;
  secret?: ConnectorSecret | null;
  createdBy: string;
}): Promise<ConnectorView> {
  const { data, error } = await getSupabaseAdmin()
    .from("connectors")
    .insert({
      firm_id: input.firmId,
      type: input.type,
      name: input.name,
      config: input.config as Json,
      secret_enc: input.secret ? encryptJson(input.secret) : null,
      created_by: input.createdBy,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return toView(data);
}

export async function patchConnector(
  firmId: string,
  id: string,
  patch: {
    name?: string;
    config?: Record<string, unknown>;
    secret?: ConnectorSecret;
    status?: "active" | "error" | "disabled";
    last_error?: string | null;
    tested?: boolean;
  },
) {
  const update: Partial<ConnectorRow> = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.config !== undefined) update.config = patch.config as Json;
  if (patch.secret !== undefined) update.secret_enc = encryptJson(patch.secret);
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.last_error !== undefined) update.last_error = patch.last_error;
  if (patch.tested) update.last_tested_at = new Date().toISOString();
  const { error } = await getSupabaseAdmin().from("connectors").update(update).eq("firm_id", firmId).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteConnector(firmId: string, id: string) {
  const { error } = await getSupabaseAdmin().from("connectors").delete().eq("firm_id", firmId).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function findCalendarFeed(token: string): Promise<{ firmId: string } | null> {
  if (!/^[A-Za-z0-9_-]{20,}$/.test(token)) return null;
  const { data } = await getSupabaseAdmin()
    .from("connectors")
    .select("firm_id, status")
    .eq("type", "calendar_feed")
    .eq("config->>token", token)
    .maybeSingle();
  return data && data.status !== "disabled" ? { firmId: data.firm_id } : null;
}
