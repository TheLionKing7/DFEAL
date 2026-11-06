export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type OpportunityRow = {
  id: string;
  source: string;
  external_id: string;
  market_tier: string;
  notice_type: string;
  title: string;
  description: string | null;
  agency_id: string | null;
  agency_name: string | null;
  naics: string | null;
  psc: string | null;
  set_aside: string | null;
  place_of_performance: Json | null;
  estimated_value_usd: number | null;
  response_deadline: string | null;
  posted_date: string | null;
  status: string;
  sam_url: string | null;
  source_url: string | null;
  raw_json: Json;
  content_hash: string | null;
  created_at: string;
  updated_at: string;
};

export type FirmRow = {
  id: string;
  slug: string;
  status: string;
  legal_name: string;
  short_name: string;
  uei: string | null;
  cage: string | null;
  duns: string | null;
  sam_status: string;
  sam_expiration_date: string | null;
  industry: string;
  primary_naics: string;
  naics_codes: string[];
  psc_codes: string[];
  keywords: string[];
  set_asides: string[];
  certifications: string[];
  home_state: string | null;
  target_states: string[];
  capability_statement: string;
  core_competencies: string[];
  differentiators: string[];
  past_performance: Json;
  go_no_go: Json;
  contact_email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  assistant_name: string | null;
  allowed_email_domains: string[];
  digest_recipients: string[];
  created_by: string | null;
  entity_type: string | null;
  employee_range: string | null;
  dba_name: string | null;
  workspace: Json;
  onboarded_at: string | null;
  created_at: string;
  updated_at: string;
};

type TableDef<R, I> = { Row: R; Insert: I; Update: Partial<R>; Relationships: [] };

export type UserProfileRow = {
  email: string;
  user_id: string | null;
  full_name: string | null;
  job_title: string | null;
  phone: string | null;
  timezone: string | null;
  created_at: string;
  updated_at: string;
};

export type FirmInvitationRow = {
  id: string;
  email: string;
  company_name: string | null;
  note: string | null;
  status: string;
  invited_by: string;
  firm_id: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

export type AssistantMemoryRow = {
  id: string;
  firm_id: string;
  user_email: string;
  scope: string;
  category: string;
  content: string;
  opportunity_id: string | null;
  source: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type ConnectorRow = {
  id: string;
  firm_id: string;
  type: string;
  name: string;
  config: Json;
  secret_enc: string | null;
  status: string;
  last_tested_at: string | null;
  last_error: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type AutomationRunRow = {
  id: string;
  automation_id: string;
  firm_id: string;
  trigger: string;
  status: string;
  matched: number;
  actions_ok: number;
  actions_failed: number;
  log: Json;
  started_at: string;
  finished_at: string | null;
};

export type AutomationEventRow = {
  id: string;
  automation_id: string;
  firm_id: string;
  opportunity_id: string;
  kind: string;
  status: string;
  fit_score: number | null;
  ai_summary: string | null;
  results: Json;
  created_at: string;
  resolved_at: string | null;
};

export type DailyBriefingRow = {
  id: string;
  firm_id: string;
  briefing_date: string;
  content: Json;
  ai_summary: string | null;
  provider: string | null;
  emailed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FirmDocumentRow = {
  id: string;
  firm_id: string;
  title: string;
  doc_type: string;
  storage_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  extracted_text: string | null;
  char_count: number;
  use_for_drafting: boolean;
  notes: string | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
};

export interface Database {
  public: {
    Tables: {
      firms: {
        Row: FirmRow;
        Insert: Partial<FirmRow> &
          Pick<FirmRow, "slug" | "legal_name" | "short_name" | "industry" | "primary_naics">;
        Update: Partial<FirmRow>;
        Relationships: [];
      };
      user_profiles: TableDef<UserProfileRow, Partial<UserProfileRow> & { email: string }>;
      firm_invitations: TableDef<
        FirmInvitationRow,
        Partial<FirmInvitationRow> & { email: string; invited_by: string }
      >;
      assistant_memories: TableDef<
        AssistantMemoryRow,
        Partial<AssistantMemoryRow> & { firm_id: string; user_email: string; content: string }
      >;
      connectors: TableDef<
        ConnectorRow,
        Partial<ConnectorRow> & { firm_id: string; type: string; name: string; created_by: string }
      >;
      automation_runs: TableDef<
        AutomationRunRow,
        Partial<AutomationRunRow> & { automation_id: string; firm_id: string }
      >;
      automation_events: TableDef<
        AutomationEventRow,
        Partial<AutomationEventRow> & {
          automation_id: string;
          firm_id: string;
          opportunity_id: string;
          kind: string;
        }
      >;
      daily_briefings: TableDef<
        DailyBriefingRow,
        Partial<DailyBriefingRow> & { firm_id: string; briefing_date: string; content: Json }
      >;
      firm_documents: TableDef<
        FirmDocumentRow,
        Partial<FirmDocumentRow> & { firm_id: string; title: string; uploaded_by: string }
      >;
      firm_members: {
        Row: {
          id: string;
          firm_id: string;
          email: string;
          user_id: string | null;
          role: string;
          invited_by: string | null;
          created_at: string;
        };
        Insert: {
          firm_id: string;
          email: string;
          user_id?: string | null;
          role?: string;
          invited_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["firm_members"]["Row"]>;
        Relationships: [];
      };
      opportunities: {
        Row: OpportunityRow;
        Insert: Omit<OpportunityRow, "created_at" | "updated_at"> &
          Partial<Pick<OpportunityRow, "created_at" | "updated_at">>;
        Update: Partial<OpportunityRow>;
        Relationships: [];
      };
      opportunity_scores: {
        Row: {
          firm_id: string;
          id: string;
          opportunity_id: string;
          fit_score: number;
          go_no_go: string;
          rationale: string;
          scored_at: string;
          digest_batch_id: string | null;
        };
        Insert: {
          firm_id: string;
          opportunity_id: string;
          fit_score: number;
          go_no_go: string;
          rationale?: string;
          digest_batch_id?: string | null;
          scored_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["opportunity_scores"]["Row"]>;
        Relationships: [];
      };
      ingest_cursors: {
        Row: {
          source: string;
          last_sync_at: string | null;
          cursor_value: string | null;
          last_status: string;
          last_error: string | null;
          rows_ingested: number;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["ingest_cursors"]["Row"]> & {
          source: string;
        };
        Update: Partial<Database["public"]["Tables"]["ingest_cursors"]["Row"]>;
        Relationships: [];
      };
      digest_runs: {
        Row: {
          firm_id: string | null;
          id: string;
          run_type: string;
          status: string;
          opportunities_scored: number;
          hot_count: number;
          email_sent: boolean;
          error_message: string | null;
          started_at: string;
          finished_at: string | null;
        };
        Insert: {
          firm_id?: string | null;
          run_type?: string;
          status?: string;
        };
        Update: Partial<Database["public"]["Tables"]["digest_runs"]["Row"]>;
        Relationships: [];
      };
      analysis_runs: {
        Row: {
          firm_id: string;
          id: string;
          opportunity_id: string;
          user_email: string | null;
          provider: string | null;
          fit_score: number | null;
          go_no_go: string | null;
          result_json: Json;
          created_at: string;
        };
        Insert: {
          firm_id: string;
          opportunity_id: string;
          user_email?: string | null;
          provider?: string | null;
          fit_score?: number | null;
          go_no_go?: string | null;
          result_json?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["analysis_runs"]["Row"]>;
        Relationships: [];
      };
      watchlists: {
        Row: {
          firm_id: string;
          id: string;
          user_email: string;
          opportunity_id: string;
          notes: string | null;
          pursuit_stage: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          firm_id: string;
          user_email: string;
          opportunity_id: string;
          notes?: string | null;
          pursuit_stage?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["watchlists"]["Row"]>;
        Relationships: [];
      };
      generated_documents: {
        Row: {
          firm_id: string;
          id: string;
          opportunity_id: string | null;
          document_type: string;
          title: string | null;
          storage_bucket: string;
          storage_path: string | null;
          content_text: string | null;
          format: string;
          provider: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          firm_id: string;
          opportunity_id?: string | null;
          document_type?: string;
          title?: string | null;
          storage_bucket?: string;
          storage_path?: string | null;
          content_text?: string | null;
          format?: string;
          provider?: string | null;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["generated_documents"]["Row"]>;
        Relationships: [];
      };
      compliance_runs: {
        Row: {
          firm_id: string;
          id: string;
          document_id: string | null;
          opportunity_id: string | null;
          provider: string | null;
          checklist_json: Json;
          pass_count: number;
          fail_count: number;
          created_at: string;
        };
        Insert: {
          firm_id: string;
          document_id?: string | null;
          opportunity_id?: string | null;
          provider?: string | null;
          checklist_json?: Json;
          pass_count?: number;
          fail_count?: number;
        };
        Update: Partial<Database["public"]["Tables"]["compliance_runs"]["Row"]>;
        Relationships: [];
      };
      chat_sessions: {
        Row: {
          firm_id: string;
          id: string;
          user_email: string | null;
          page_context: Json;
          title: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          firm_id: string;
          user_email?: string | null;
          page_context?: Json;
          title?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["chat_sessions"]["Row"]>;
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          session_id: string;
          role: string;
          content: string;
          provider: string | null;
          created_at: string;
        };
        Insert: {
          session_id: string;
          role: string;
          content: string;
          provider?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["chat_messages"]["Row"]>;
        Relationships: [];
      };
      user_opportunity_lists: {
        Row: {
          firm_id: string;
          id: string;
          user_email: string;
          opportunity_id: string;
          list_type: string;
          created_at: string;
        };
        Insert: {
          firm_id: string;
          user_email: string;
          opportunity_id: string;
          list_type: string;
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_opportunity_lists"]["Row"]>;
        Relationships: [];
      };
      user_assistant_settings: {
        Row: {
          firm_id: string;
          user_email: string;
          custom_instructions: string | null;
          personalization: Json;
          memories: Json;
          connector_prefs: Json;
          updated_at: string;
        };
        Insert: {
          firm_id: string;
          user_email: string;
          custom_instructions?: string | null;
          personalization?: Json;
          memories?: Json;
          connector_prefs?: Json;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_assistant_settings"]["Row"]>;
        Relationships: [];
      };
      user_automations: {
        Row: {
          last_run_at: string | null;
          last_run_status: string | null;
          last_run_summary: string | null;
          firm_id: string;
          id: string;
          user_email: string;
          name: string;
          enabled: boolean;
          description: string | null;
          config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          last_run_at?: string | null;
          last_run_status?: string | null;
          last_run_summary?: string | null;
          firm_id: string;
          user_email: string;
          name: string;
          enabled?: boolean;
          description?: string | null;
          config?: Json;
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_automations"]["Row"]>;
        Relationships: [];
      };
    };
    Views: {
      hot_opportunities: {
        Row: OpportunityRow & {
          firm_id: string;
          fit_score: number;
          go_no_go: string;
          score_rationale: string;
          scored_at: string;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type DbOpportunity = Database["public"]["Tables"]["opportunities"]["Row"];
export type HotOpportunity =
  Database["public"]["Views"]["hot_opportunities"]["Row"];
