# DFEAL Capture Platform

Internal, **single-tenant** AI platform built exclusively for **DFEAL LLC**. Not a multi-tenant SaaS product — every AI call is scoped to DFEAL's identity, capabilities, and procurement goals.

## Purpose

Help DFEAL's team win **federal and SLED** (State, Local, Education) government contracts by automating the most time-intensive parts of business development:

| Capability | Outcome |
|------------|---------|
| **Daily hot-opportunity surfacing** | Relevant contracts aligned to DFEAL NAICS and capabilities, delivered automatically every day |
| **Opportunity Analyzer** | Solicitation analysis + go/no-go scoring against DFEAL's profile in minutes, not days |
| **Document Generator** | Submission-ready proposal documents using DFEAL's real credentials — not generic templates |
| **Compliance Validator** | Pre-submission checks against Section L/M requirements |
| **AI Consultant Chat** | On-demand procurement strategy across federal, state, local, and education markets |
| **Procurement strategy** | Market-specific BD guidance woven into analyzer and chat flows |
| **Export** | PDF/DOCX generation and file storage for proposals and reports |

## What this is not

- Not GovTribe, DemandStar, or a white-label SaaS
- Not multi-tenant — no org signup, billing, or per-customer config UI in v1
- Not a generic discovery tool — DFEAL company data is **baked into the system prompt layer**

## Geography & data sources

| Market | Priority | Sources (build-only) |
|--------|----------|----------------------|
| **Federal** | P0 | [SAM.gov](https://sam.gov), [SBA](https://www.sba.gov) |
| **State / Local / Education (SLED)** | P1 | [DemandStar](https://www.demandstar.com), state portals (e.g. [BidBuy Illinois](https://www.bidbuy.illinois.gov), [Bonfire — Chicago Transit](https://transitchicago.bonfirehub.com)) |
| **Ohio & Georgia** | P1 | State procurement registries (see `docs/STATE-CONNECTORS-OH-GA.md`) |

No paid GovWin/BidNet feeds. Connectors and scrapers are built in-house.

## DFEAL identity layer

All company identity data is centralized and injected into every AI module:

- UEI, CAGE, legal name, SAM registration status
- NAICS codes, PSC, certifications (8(a), SDVOSB, etc.)
- Past performance summaries, key personnel, differentiators
- Default go/no-go criteria and capability statements

See **`config/dfeal-profile.example.ts`** and **`docs/DFEAL-COMPANY-PROFILE.md`**. Copy to `dfeal-profile.ts` (gitignored) and fill with real values.

## Repository layout

```
DFEAL/
├── us-contractor-platform/          ← UI shells, types, SAM/state stubs (this pack)
│   ├── README.md                    ← you are here
│   ├── config/                      ← DFEAL profile template
│   ├── docs/                        ← architecture, ingest, routes, company profile
│   ├── design/                      ← CSS tokens + Tailwind snippet
│   ├── shared/                      ← normalized types, lanes, AI page context
│   ├── components/                  ← layout, opportunity detail, assistant, marketing
│   └── lib/                         ← SAM.gov + SLED connector stubs
└── (app/)                           ← greenfield Next.js app — scaffold next
```

## Recommended stack

- **Next.js 14+** (App Router) — web + API route handlers
- **Postgres** — opportunities, agencies, watchlist, entity cache, generated documents metadata
- **Redis or pg-boss** — ingest queues, daily scoring jobs
- **Object storage** (S3/R2/local) — PDF/DOCX exports, solicitation attachments
- **LLM providers** — **Claude (Anthropic) primary**, **Groq fallback** — server-side only; system prompts include DFEAL profile
- **Cron/worker** — SAM ingest (15–60 min), SLED connectors, daily hot-opp digest

## Implementation status (June 2026)

The runnable app lives in **`../app/`** (Smart Capture on Vercel). This folder remains the **scope and design reference** from the original brief.

| Phase | Progress | Notes |
|-------|----------|-------|
| 0 Foundation | Done | App scaffolded, Supabase, auth, DFEAL profile |
| 1 Federal + surfacing | ~90% | SAM, scoring, Explore, digest, entity API; reports stubbed; UEI needs SAM verification |
| 2 Documents + compliance | ~65% | Doc gen, compliance, assistant; export polish incomplete |
| 3 SLED | ~70% | DemandStar + IL + Georgia live; Ohio stub |
| 4 Intelligence | ~30% | Grants early; briefing UI; automations shell only |

See **[../README.md](../README.md)** for the full remaining-work checklist and env setup.

## Phase plan (original scope)

### Phase 1 — Federal core + daily surfacing (launch)

- SAM.gov Opportunities API ingest → normalized `Opportunity` rows
- DFEAL profile–aware **daily hot-opportunity job** (NAICS + capability match + score)
- Explore + search + filters (NAICS, set-aside, agency, deadline)
- Opportunity detail: Overview · Contacts · Similar · Files · Updates
- **Opportunity Analyzer** on detail page (go/no-go + rationale)
- SAM Entity Management API: UEI/CAGE lookup (verify DFEAL registration)
- Watchlist + email/Slack digest for new matches

### Phase 2 — AI document & compliance

- **Document Generator** — proposal shells from solicitation + DFEAL credentials
- **Compliance Validator** — Section L/M checklist against generated or uploaded docs
- **Export** — PDF/DOCX via server-side renderer (e.g. docx templating + puppeteer/pdf-lib)
- **AI Consultant Chat** — context-aware (page + opportunity + DFEAL profile)

### Phase 3 — SLED expansion

- DemandStar + Illinois (BidBuy, Bonfire) connectors
- Ohio + Georgia state portals (see `docs/STATE-CONNECTORS-OH-GA.md`)
- Lanes: Federal · State · Local · Education
- **Procurement strategy** prompts tuned per market tier

### Phase 4 — Intelligence & automation

- Grants.gov / federal grant notices
- USAspending snippets on agency pages
- Pipeline CRM, amendment tracking, richer agent workflows

## Quick start

### Prerequisites (you set up while we build)

See **Setup checklist for DFEAL team** at the bottom of this file.

### Scaffold

```bash
# From DFEAL repo root
npx create-next-app@latest app --typescript --tailwind --app --src-dir
cd app
npm install clsx tailwind-merge
```

Then:

1. Copy `us-contractor-platform/design/globals.css` → `app/src/app/globals.css` (merge tokens)
2. Copy `shared/` → `app/src/shared/`
3. Copy `components/` → `app/src/components/` (fix `@/` imports)
4. Copy `lib/` → `app/src/lib/`
5. Copy `config/dfeal-profile.example.ts` → `app/src/config/dfeal-profile.ts` and fill in
6. Read `docs/ROUTE-MAP.md` and scaffold App Router pages
7. Implement `lib/sam-gov/client.ts` with real API key (stubs in repo)
8. Wire ingest worker **before** building search UI
9. Implement daily hot-opp scorer using DFEAL profile

## AI modules (architecture summary)

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js UI — Explore, Opportunities, Analyzer, Docs, Chat  │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  API — /api/opportunities, /api/analyze, /api/documents,    │
│        /api/compliance, /api/assistant, /api/entity          │
└───────────────────────────┬─────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
   ┌──────────┐      ┌────────────┐     ┌─────────────┐
   │ Postgres │      │ LLM API    │     │ Object store│
   │ + queue  │      │ + DFEAL    │     │ PDF/DOCX    │
   └──────────┘      │   profile  │     └─────────────┘
                     └────────────┘
```

Each AI route prepends `buildDfealSystemPrompt()` from the company profile config. See `docs/ARCHITECTURE.md`.

## UI notes

- Rebrand **CaptureOS** placeholder → **DFEAL** (or client-chosen product name) in `components/layout/Sidebar.tsx`
- GovTribe-style layout is **inspiration only** — own copy and assets
- AI entry: header button → full workspace (`components/assistant/AssistantWorkspace.tsx`)

## Legal & compliance

- SAM.gov API: cache responsibly, attribute source, respect rate limits
- SLED portals: review ToS before scraping; prefer official feeds/APIs
- Generated proposals: human review required before submission — platform assists, does not auto-submit

## Related docs

| Doc | Contents |
|-----|----------|
| `docs/CLIENT-SCOPE.md` | Persona, geography, success metrics |
| `docs/ARCHITECTURE.md` | Tables, AI module design, security |
| `docs/ROUTE-MAP.md` | App Router + API routes |
| `docs/SAM-GOV-INGEST.md` | Federal ingest |
| `docs/STATE-CONNECTORS-OH-GA.md` | Ohio & Georgia |
| `docs/DFEAL-COMPANY-PROFILE.md` | Identity fields to collect |
| `docs/SOURCE-MANIFEST.md` | ProcureIQ pattern mapping |
| `TRANSFER-CHECKLIST.md` | Implementation checklist |

---

## Setup checklist for DFEAL team

Set these up in parallel while development proceeds:

### Required before Phase 1 ingest

| Item | Action | Notes |
|------|--------|-------|
| **SAM.gov API key** | Register at [SAM.gov API](https://api.sam.gov/) | Store as `SAM_GOV_API_KEY` — never client-side |
| **Postgres database** | Local Docker, Neon, Supabase, or RDS | Connection string → `DATABASE_URL` |
| **DFEAL company profile** | Fill `config/dfeal-profile.ts` | UEI, CAGE, NAICS, certs, past performance — see `docs/DFEAL-COMPANY-PROFILE.md` |
| **LLM API keys** | Anthropic (primary) + Groq (fallback) | `ANTHROPIC_API_KEY` and `GROQ_API_KEY` for analyzer + chat |
| **Node.js 20+** | Local dev environment | For Next.js app |

### Required before Phase 2 (documents & export)

| Item | Action | Notes |
|------|--------|-------|
| **Object storage** | S3, Cloudflare R2, or Azure Blob | `S3_*` env vars for PDF/DOCX storage |
| **Proposal templates** | Provide 1–2 redacted past proposals | Used to tune Document Generator tone/structure |
| **Section L/M samples** | Upload example RFP compliance matrices | Trains Compliance Validator patterns |

### Required before Phase 3 (SLED)

| Item | Action | Notes |
|------|--------|-------|
| **DemandStar access** | Confirm login/API if available | May require scraper fallback |
| **Target states/localities** | Prioritize list beyond IL/OH/GA | Drives connector build order |
| **Bonfire / BidBuy credentials** | If portals require auth | For Chicago transit, Illinois state |

### Optional but recommended

| Item | Action | Notes |
|------|--------|-------|
| **Email (Resend/SendGrid)** | For daily hot-opp digest | `RESEND_API_KEY` |
| **Redis** | Job queue for ingest + scoring | Or use pg-boss on Postgres |
| **Domain + hosting** | Vercel/Railway/Fly for app | Single-tenant internal deploy |
| **Auth** | Clerk, NextAuth, or simple env gate | Internal team only — no public signup |

### Information we need from you

1. **Exact DFEAL NAICS codes** (primary + secondary)
2. **UEI and CAGE** (for entity verification and AI context)
3. **Certifications** (8(a), HUBZone, SDVOSB, WOSB, etc.)
4. **Capability statement** (1–2 pages)
5. **Past performance** (3–5 contract summaries: agency, value, scope)
6. **Go/no-go rules** (e.g. min contract value, excluded agencies, set-aside preferences)
7. **Brand preference** — product name and tagline (replacing "CaptureOS")
8. **Team size** — who gets login access in v1
