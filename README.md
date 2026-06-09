# Smart Capture — DFEAL LLC

Internal AI capture platform for **DFEAL LLC**: federal and SLED contract intelligence, go/no-go analysis, proposal generation, compliance checks, and an integrated capture assistant.

**Production:** [https://dfeal.vercel.app](https://dfeal.vercel.app) · App root: `app/` · Deployed via Vercel

Run locally:

```bash
cd app && npm install && npm run dev
```

---

## Current status (June 2026)

The live app is **past Phase 0** and **operational for daily capture work**. Phases overlap in the codebase — some Phase 3/4 items were built early (grants, DemandStar, assistant UX).

| Phase | Focus | Progress | Summary |
|-------|--------|----------|---------|
| **0** | Foundation | **Done** | Next.js app, Supabase schema, DFEAL profile, design tokens, auth |
| **1** | Federal core + daily surfacing | **~90%** | SAM ingest, scoring, Explore, workspace analyzer, watchlist, email digest, entity lookup API |
| **2** | AI documents & compliance | **~65%** | Document generator, compliance validator, full assistant workspace; export/report polish incomplete |
| **3** | SLED expansion | **~70%** | DemandStar, IL (BidBuy, Bonfire, education, state univ), Georgia live; Ohio stub |
| **4** | Intelligence & automation | **~30%** | Grants.gov + SBA ingest, briefing page, automations UI; no runner, no USAspending CRM |

### What works today

- **Federal:** SAM.gov ingest (~190+ notices), rule-based DFEAL scoring, hot feed, opportunity workspace (analyze, summarize, pursuits)
- **SLED:** BidBuy IL, Bonfire, Georgia GPR, IL education bulletins, Illinois higher-ed; **DemandStar (Euna OpenBids)** with live ingest (~129 opps in test)
- **Grants:** Grants.gov + SBA programs/events
- **Daily pipeline:** Cron ingest → score → Resend email digest
- **Assistant:** Chat sessions, briefing page, track/favourite lists, settings (connectors, personalization, instructions, memories)
- **Entity lookup:** SAM Entity API wired; honest fallback when UEI/CAGE not found in SAM

### Remaining work (by priority)

**Phase 1 — finish launch**

- [ ] Confirm **correct UEI/CAGE** in `app/src/config/dfeal-profile.ts` (SAM returns 0 records for `G1XCPA2ANMC3` / `15RT3` as of June 2026)
- [ ] Run Supabase migrations on production if not done:
  - `supabase/migrations/20250608100000_phase1_connectors.sql`
  - `supabase/migrations/20250608100100_phase1_connectors_cursors.sql`
  - `supabase/migrations/20250609100000_assistant_workspace.sql`
- [ ] Add `DEMANDSTAR_USERNAME` / `DEMANDSTAR_PASSWORD` to **Vercel** env (local ingest tested)
- [ ] Reports pages (`/reports/digest`, `/reports/pipeline`, `/reports/scoring`) — still placeholder
- [ ] Opportunity detail tabs: Contacts · Similar · Files · Updates as first-class data
- [ ] Slack digest (optional; email works)

**Phase 2 — documents & compliance**

- [ ] Production-grade PDF/DOCX export pipeline
- [ ] Solicitation attachment ingest for compliance (Section L/M parsing)
- [ ] DFEAL redacted proposal templates in `/files/templates`

**Phase 3 — SLED**

- [ ] **OhioBuys** connector (credentials + ingest not implemented)
- [ ] Lane data quality at scale (DemandStar keyword filter may need tuning / `DEMANDSTAR_STATES=IL`)
- [ ] DB cleanup for duplicate SAM rows (UI dedupes; no migration yet)

**Phase 4 — intelligence & automation**

- [ ] **Automation runner** (WhatsApp / approve→draft — UI + DB only today)
- [ ] USAspending on agency pages
- [ ] Pipeline CRM depth, amendment tracking
- [ ] Richer agent tool-calling over full opportunity DB

---

## Repository layout

```
DFEAL/
├── app/                          ← Next.js 16 app (production code)
│   ├── src/app/                  ← routes + API (cron, assistant, entity, …)
│   ├── src/lib/                  ← ingest, scoring, connectors, AI
│   └── src/config/dfeal-profile.ts
├── supabase/migrations/          ← Postgres schema
└── us-contractor-platform/       ← original scope docs, types, design reference
```

---

## Environment (app/.env.local)

See `app/.env.example`. Minimum for full operation:

| Variable | Purpose |
|----------|---------|
| `SAM_GOV_API_KEY` | SAM opportunities + entity API |
| `NEXT_PUBLIC_SUPABASE_URL` / keys | Auth + database |
| `ANTHROPIC_API_KEY` or `GROQ_API_KEY` | Assistant + analyzer |
| `CRON_SECRET` | Daily ingest cron |
| `RESEND_API_KEY` / `DIGEST_EMAIL_TO` | Email digest |
| `SLED_INGEST_ENABLED=1` | SLED daily ingest |
| `GRANTS_INGEST_ENABLED=1` | Grants daily ingest |
| `DEMANDSTAR_USERNAME` / `PASSWORD` | OpenBids SLED connector |

---

## Useful commands

```bash
cd app
npm run dev
npm run build
npx tsx scripts/test-demandstar-ingest.ts          # DemandStar fetch test
npx tsx scripts/test-demandstar-ingest.ts --upsert # DemandStar + DB upsert
npx tsx scripts/probe-sam-dfeal.ts                 # SAM entity probe for DFEAL UEI/name
```

---

## Documentation

| Doc | Path |
|-----|------|
| Original scope & phase plan | [us-contractor-platform/README.md](us-contractor-platform/README.md) |
| Client scope | [us-contractor-platform/docs/CLIENT-SCOPE.md](us-contractor-platform/docs/CLIENT-SCOPE.md) |
| Architecture | [us-contractor-platform/docs/ARCHITECTURE.md](us-contractor-platform/docs/ARCHITECTURE.md) |
| SLED connectors | [us-contractor-platform/docs/SLED-CONNECTORS.md](us-contractor-platform/docs/SLED-CONNECTORS.md) |
| DFEAL profile checklist | [us-contractor-platform/docs/DFEAL-COMPANY-PROFILE.md](us-contractor-platform/docs/DFEAL-COMPANY-PROFILE.md) |

---

## Live connectors

| Source | Status |
|--------|--------|
| SAM.gov | Live |
| Grants.gov, SBA | Live |
| DemandStar (OpenBids) | Live (credentials required) |
| BidBuy IL, Bonfire, Georgia, IL education, State Univ IL | Live |
| Ohio, DemandStar lanes without creds | Stub / credentials required |
