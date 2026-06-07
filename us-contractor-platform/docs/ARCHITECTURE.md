# Architecture — DFEAL internal capture platform

## System diagram

```
┌──────────────────────────────────────────────────────────────────┐
│  Next.js App                                                     │
│  Explore · Opportunities · Analyzer · Documents · Compliance ·   │
│  Entity · Watchlist · AI Chat                                    │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│  API Layer (Route Handlers)                                      │
│  /api/opportunities  /api/analyze  /api/documents                │
│  /api/compliance     /api/assistant  /api/entity  /api/watchlist │
└────────────────────────────┬─────────────────────────────────────┘
                             │
      ┌──────────────────────┼──────────────────────┐
      ▼                      ▼                      ▼
┌──────────┐          ┌────────────┐         ┌─────────────┐
│ Postgres │          │ LLM API    │         │ Object store│
│ (core)   │          │ + DFEAL    │         │ PDF/DOCX    │
└──────────┘          │   profile  │         │ attachments │
      │               └────────────┘         └─────────────┘
      ▼
┌────────────┐
│ Job queue  │  Redis or pg-boss
└────────────┘

Cron workers:
  SAM Opportunities ──► normalize ──► upsert opportunities
  SLED connectors   ──► normalize ──► upsert (source=sled_*)
  Daily hot-opp job ──► score vs DFEAL profile ──► digest + notifications
  SAM Entity        ──► on-demand + cache
```

## DFEAL identity layer

Central config (`config/dfeal-profile.ts`, gitignored) exports:

```typescript
export function buildDfealSystemPrompt(): string
export function getDfealScoringCriteria(): ScoringCriteria
export const DFEAL_ENTITY: { uei, cage, legalName, naics, ... }
```

Every AI route (`/api/analyze`, `/api/documents`, `/api/compliance`, `/api/assistant`) prepends this system prompt. Scoring jobs use the same NAICS, certifications, and go/no-go rules.

**Do not** fetch company identity from a multi-tenant DB — it is static config for v1.

## AI modules

| Module | Input | Output | Storage |
|--------|-------|--------|---------|
| **Daily surfacing** | New opportunities since last run | Ranked list + scores | `opportunity_scores`, email digest |
| **Analyzer** | Opportunity ID + optional user notes | Go/no-go, fit score, risks, gaps | `analysis_runs` |
| **Document Generator** | Opportunity ID + section template | DOCX/HTML sections | `generated_documents` + object store |
| **Compliance Validator** | Proposal file or generated doc ID | L/M checklist with pass/fail | `compliance_runs` |
| **Consultant Chat** | Message + page_context | Streaming reply | `chat_sessions` (optional) |

LLM calls are **server-side only**. Rate-limit and log token usage per module.

## Core tables (minimal)

```sql
-- opportunities (federal + SLED in one table)
id, source, external_id, market_tier, notice_type, title, description,
agency_id, naics, psc, set_aside, place_of_performance,
estimated_value, response_deadline, posted_date, status,
raw_json, content_hash, created_at, updated_at

-- agencies
id, source, external_id, name, parent_id, level, state_code, market_tier, raw_json

-- sam_entities (cache)
uei, cage, legal_name, status, expiration_date, naics[], raw_json, fetched_at

-- opportunity_scores (DFEAL daily surfacing)
opportunity_id, fit_score, go_no_go, rationale, scored_at

-- analysis_runs
id, opportunity_id, user_id, result_json, created_at

-- generated_documents
id, opportunity_id, type, storage_key, format, created_at

-- compliance_runs
id, document_id, opportunity_id, checklist_json, created_at

-- watchlists
user_id, opportunity_id, notes, created_at

-- opportunity_updates (amendments)
opportunity_id, label, detail, posted_at
```

## Market tiers

Map sources to `market_tier`:

| Tier | Examples |
|------|----------|
| `federal` | SAM.gov |
| `state` | BidBuy IL, OhioBuys, Georgia DOAS |
| `local` | Bonfire municipal, city/county portals |
| `education` | K-12 / higher-ed cooperative listings |

See `shared/opportunity-lanes.ts`.

## Normalized opportunity model

One schema regardless of source — see `shared/types/opportunity.ts`.

## UI architecture

| Surface | Pattern |
|---------|---------|
| Internal app | Login → dashboard shell (no public marketing required for v1) |
| Authenticated shell | Left nav + top header (search, AI, alerts) |
| Explore | Lanes: Federal · State · Local · Education |
| Opportunity detail | Title → contract strip → tabs → **Analyze** action |
| Analyzer | Side panel or tab: score, rationale, go/no-go |
| Documents | Generate + preview + export |
| Compliance | Upload or link generated doc → checklist |
| AI | Header button → full workspace, context-aware |

## Search

- **MVP**: Postgres `tsvector` on title + description + agency name
- **Scale**: Typesense or OpenSearch when > ~100k rows

## Security

- SAM + LLM API keys in server env only
- `dfeal-profile.ts` gitignored — never commit UEI/CAGE/secrets
- Single-tenant: optional simple auth (no public registration)
- Generated documents may contain sensitive proposal data — encrypt at rest in object store

## What not to port from ProcureIQ

- Nigeria-specific integrations (NOCOPO, BPP, NGN)
- Multi-tenant org/billing models
- OnFrontiers integration
