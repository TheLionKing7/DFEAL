# State connectors — Ohio & Georgia (build-only)

There is no unified US state API. Plan **one connector module per state** with the same output: `NormalizedOpportunity[]`.

## Ohio

Research targets (verify current URLs):

- OhioBuys / Ohio Department of Administrative Services procurement portal
- Optional: Ohio Cooperative Purchasing program listings

**Connector pattern:**

```typescript
// lib/state/ohio.ts
export async function fetchOhioOpportunities(since: Date): Promise<NormalizedOpportunity[]>
```

Implementation options (in order of preference):

1. **Official RSS/JSON** if exposed
2. **Structured HTML scrape** with cheerio/playwright + stable selectors
3. **Manual CSV import** admin tool for bootstrap

Set `source: 'ohio'`, `place_of_performance.state: 'OH'`.

## Georgia

Research targets:

- Georgia Procurement Registry (DOAS)
- Team Georgia Marketplace / equivalent

Same interface as Ohio:

```typescript
// lib/state/georgia.ts
export async function fetchGeorgiaOpportunities(since: Date): Promise<NormalizedOpportunity[]>
```

Set `source: 'georgia'`, `place_of_performance.state: 'GA'`.

## Normalization rules

All state opps must fit `shared/types/opportunity.ts`:

- Generate stable `external_id` from portal notice number
- Map state agency name → `agencies` row with `level: 'state'`, `state_code`
- If value unknown, leave `estimated_value` null
- Attach `sam_url` null; use `source_url` for state portal link

## Explore lanes

See `shared/opportunity-lanes.ts`:

- Federal (SAM)
- Ohio
- Georgia
- Grants (phase 2)

## Testing

- Snapshot tests on normalized output (golden files)
- Monitor connector health: last_success_at, rows_ingested, error_message

## Legal

Review each portal Terms of Use before scraping. Prefer feeds/APIs when offered.
