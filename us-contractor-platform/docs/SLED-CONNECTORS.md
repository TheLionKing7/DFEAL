# SLED connectors — DemandStar, Illinois, and beyond

DFEAL scope includes **State, Local, and Education** markets in addition to federal SAM.gov. There is no unified SLED API — plan **one connector module per source** with the same output: `NormalizedOpportunity[]`.

## Priority sources (from client brief)

| Source | URL | Market tier | Notes |
|--------|-----|-------------|-------|
| DemandStar | https://www.demandstar.com | state, local, education | Broad aggregator; may need login/scrape |
| BidBuy Illinois | https://www.bidbuy.illinois.gov | state | Illinois state procurement |
| Bonfire (Chicago Transit) | https://transitchicago.bonfirehub.com | local | Example municipal/regional portal |
| SBA | https://www.sba.gov | federal (resources) | Cert guidance, not opp feed |

Ohio and Georgia have dedicated docs: `docs/STATE-CONNECTORS-OH-GA.md`.

## Connector pattern

```typescript
// lib/sled/demandstar.ts
export async function fetchDemandStarOpportunities(since: Date): Promise<NormalizedOpportunity[]>

// lib/sled/bidbuy-illinois.ts
export async function fetchBidBuyIllinoisOpportunities(since: Date): Promise<NormalizedOpportunity[]>

// lib/sled/bonfire.ts
export async function fetchBonfireOpportunities(portalUrl: string, since: Date): Promise<NormalizedOpportunity[]>
```

Set on each record:

- `source`: `'demandstar'` | `'bidbuy_il'` | `'bonfire'` | etc.
- `market_tier`: `'state'` | `'local'` | `'education'`
- `place_of_performance.state` when known
- `source_url` for portal link (`sam_url` null for non-SAM)

## Implementation options (preference order)

1. Official RSS/JSON/API if exposed
2. Structured HTML scrape (cheerio/playwright) with stable selectors
3. DemandStar account + export if ToS allows
4. Manual CSV import admin tool for bootstrap

## Daily surfacing integration

SLED opportunities flow through the same **DFEAL profile scoring job** as SAM:

1. Ingest → normalize → upsert
2. Score against NAICS, go/no-go rules, certifications
3. Include in daily digest if `fit_score` above threshold

## Environment (examples)

```env
DEMANDSTAR_USERNAME=
DEMANDSTAR_PASSWORD=
BONFIRE_PORTALS=https://transitchicago.bonfirehub.com
```

Store credentials server-side only. Never expose in client.

## Testing

- Snapshot tests on normalized output (golden files)
- Monitor: `last_success_at`, `rows_ingested`, `error_message` per connector

## Legal

Review each portal Terms of Use before scraping. Prefer feeds/APIs when offered.
