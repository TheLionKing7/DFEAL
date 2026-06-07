export type AgencyLevel = 'federal' | 'state' | 'local';

export interface Agency {
  id: string;
  source: 'sam' | 'ohio' | 'georgia';
  external_id: string;
  name: string;
  parent_id: string | null;
  level: AgencyLevel;
  state_code: string | null;
  website: string | null;
}
