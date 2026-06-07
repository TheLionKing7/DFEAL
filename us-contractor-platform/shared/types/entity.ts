export interface SamEntity {
  uei: string;
  cage: string | null;
  legal_name: string;
  dba_name: string | null;
  registration_status: 'active' | 'inactive' | 'expired' | 'unknown';
  expiration_date: string | null;
  naics_codes: string[];
  psc_codes: string[];
  physical_address: {
    city?: string;
    state?: string;
    zip?: string;
  } | null;
  fetched_at: string;
  raw_data: Record<string, unknown>;
}
