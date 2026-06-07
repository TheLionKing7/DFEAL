import type { Opportunity } from '../../shared/types/opportunity';

/** Ohio state/local ingest — implement per docs/STATE-CONNECTORS-OH-GA.md */
export async function fetchOhioOpportunities(_since: Date): Promise<Partial<Opportunity>[]> {
  return [];
}

export const OHIO_CONNECTOR_META = {
  id: 'ohio',
  name: 'Ohio procurement portal',
  status: 'stub' as const,
  phase: 1,
};
