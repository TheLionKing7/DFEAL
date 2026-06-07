import type { Opportunity } from '../../shared/types/opportunity';

/** Georgia state/local ingest — implement per docs/STATE-CONNECTORS-OH-GA.md */
export async function fetchGeorgiaOpportunities(_since: Date): Promise<Partial<Opportunity>[]> {
  return [];
}

export const GEORGIA_CONNECTOR_META = {
  id: 'georgia',
  name: 'Georgia procurement portal',
  status: 'stub' as const,
  phase: 1,
};
