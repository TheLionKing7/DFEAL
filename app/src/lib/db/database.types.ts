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

export interface Database {
  public: {
    Tables: {
      opportunities: {
        Row: OpportunityRow;
        Insert: Omit<OpportunityRow, "created_at" | "updated_at"> &
          Partial<Pick<OpportunityRow, "created_at" | "updated_at">>;
        Update: Partial<OpportunityRow>;
        Relationships: [];
      };
      opportunity_scores: {
        Row: {
          id: string;
          opportunity_id: string;
          fit_score: number;
          go_no_go: string;
          rationale: string;
          scored_at: string;
          digest_batch_id: string | null;
        };
        Insert: {
          opportunity_id: string;
          fit_score: number;
          go_no_go: string;
          rationale?: string;
          digest_batch_id?: string | null;
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
          run_type?: string;
          status?: string;
        };
        Update: Partial<Database["public"]["Tables"]["digest_runs"]["Row"]>;
        Relationships: [];
      };
    };
    Views: {
      hot_opportunities: {
        Row: OpportunityRow & {
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
