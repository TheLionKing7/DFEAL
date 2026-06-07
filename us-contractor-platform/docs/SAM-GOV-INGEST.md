# SAM.gov API — ingest guide

> Stubs: `lib/sam-gov/client.stub.ts`, `lib/sam-gov/normalize.ts`, `lib/sam-gov/types.ts`

## Endpoints (verify against current SAM OpenAPI)

SAM.gov evolves — confirm paths in [SAM.gov API docs](https://open.gsa.gov/api/opp-api/) before implementation.

### Opportunities (Contract Opportunities API)

Typical flow:

1. **Search** active notices (paginated) with `postedFrom` / `postedTo` or `limit` + `offset`
2. **Get by notice ID** for detail refresh
3. Store `noticeId` as `external_id`, full payload in `raw_json`

Fields to map (names vary by API version):

| SAM field (conceptual) | Our field |
|------------------------|-----------|
| noticeId | external_id |
| title | title |
| description / fullText | description |
| type | notice_type |
| naicsCode | naics |
| classificationCode | psc |
| typeOfSetAside | set_aside |
| responseDeadLine | response_deadline |
| postedDate | posted_date |
| officeAddress / organizationName | agency (resolve to agencies table) |
| uiLink | sam_url |

### Entity Management API

On-demand + cache:

```
GET entity?ueiSAM={uei}   or   cageCode={cage}
```

Map to `shared/types/entity.ts`. Cache in `sam_entities` with TTL (e.g. 24h).

## Ingest strategy

```
Every 30 min:
  1. Fetch notices updated since last_sync cursor
  2. Normalize each → upsert by (source='sam', external_id)
  3. Detect content_hash change → append opportunity_updates row
  4. Update last_sync cursor

Daily:
  Full reconcile of active notices (deadline not passed)
```

## Rate limits

- Batch requests; exponential backoff on 429
- Never call SAM from browser
- Consider read-through cache for detail pages

## Environment

```env
SAM_GOV_API_KEY=
SAM_GOV_API_BASE=https://api.sam.gov/prod/opportunities/v2/search
SAM_ENTITY_API_BASE=https://api.sam.gov/entity-information/v3/entities
```

## UI linkage

Opportunity detail should show:
- **Open on SAM.gov** (uiLink)
- Notice ID monospace in contract header strip
- Set-aside + NAICS badges in title block

Pattern borrowed from ProcureIQ `OpportunityContractHeader.tsx`.
