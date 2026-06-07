import type { SamEntity } from '../../shared/types/entity';

/**
 * SAM Entity Management API — implement with client's API key.
 * GET entity-information/v3/entities?ueiSAM={uei}
 */
export async function lookupSamEntity(options: {
  uei?: string;
  cage?: string;
  apiKey: string;
}): Promise<SamEntity | null> {
  void options;
  throw new Error('Implement SAM entity lookup — see docs/SAM-GOV-INGEST.md');
}
