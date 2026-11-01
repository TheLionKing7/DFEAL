# Smart Capture

Multi-tenant AI capture platform for government contractors: federal + SLED
opportunity ingest, per-firm fit scoring, go/no-go analysis, proposal
generation, compliance checks, and a capture assistant.

Every firm onboarded gets its own NAICS codes, industry, scoring rules, AI
context, documents, pursuits, team, and daily digest. Opportunities are ingested
once for the whole platform and scored separately for each firm.

App root: `app/` (Next.js 16, deployed on Vercel) · Database: Supabase (`supabase/migrations`)

```bash
cd app && cp .env.example .env.local   # fill in values
npm install && npm run dev
```

---

## How multi-tenancy works

| Concept | Where |
|---|---|
| **Firm** (tenant) — legal name, UEI/CAGE, industry, primary + secondary NAICS, keywords, set-asides, home/target states, capability narrative, past performance, go/no-go rules, digest recipients | `firms` table · `src/lib/firms/` |
| **Membership** — who can use a firm's workspace (`owner` / `admin` / `member`) | `firm_members` table |
| **Platform admins** — onboard/suspend firms, open any workspace | `PLATFORM_ADMIN_EMAILS` env var |
| **Active firm** per request | `resolveFirmContext()` in `src/lib/firms/context.ts` (cookie `sc_firm` → first membership → auto-join by email domain) |
| **Scoping** | Every tenant table has `firm_id`; every API route uses `requireFirmApi()`; RLS mirrors it as defence in depth |
| **Scoring** | `scoreOpportunity(opp, firm)` — NAICS match vs. the firm's codes, keyword/competency fit, home/target state, set-aside, deadline, value, agency rules |
| **Ingest** | SAM.gov is queried for the union of all active firms' NAICS; SLED/grants are filtered by the union of their keywords (`src/lib/firms/ingest-profile.ts`) |
| **NAICS reference** | Full NAICS 2022 list (1,012 codes) in `src/lib/naics/` — every code entered is validated |
| **Industry presets** | `src/lib/firms/industries.ts` — 16 industries that pre-fill suggested NAICS, keywords and competencies |

### Onboarding a firm

**In the app (recommended).** Sign in as a platform admin → sidebar **Platform admin · Firms** → **+ Onboard firm**.
1. Pick an industry — suggested NAICS codes, keywords and competencies are pre-filled.
2. Search/add NAICS codes (by code or keyword) and choose the primary.
3. Set set-asides, home/target states, go/no-go rules, capability narrative and past performance.
4. Add the owner's email and the firm's email domain(s) for auto-join.
5. Save → the firm is created, the owner is emailed an invite, and the current opportunity pool is scored for the firm immediately.

**From the CLI.** `cd app && npm run firm:onboard -- ../supabase/seed/example-firm.json owner@firm.com`

**Self-serve.** Set `ALLOW_SELF_SIGNUP=1` and any signed-in user without a firm is sent to `/onboarding` to create their own.

Firm admins manage their profile, NAICS, scoring rules and team under **Firm profile & settings**. Saving re-scores the feed.

### Sign-in

Magic links are issued by `POST /api/auth/magic-link` only to emails that are a firm member, match a firm's auto-join domain, are platform admins, or when self-signup is on. Everyone else gets the same generic response (no account enumeration).

---

## Deployment

1. **Migrations** — apply everything in `supabase/migrations` (`supabase db push`). `20261031000000_multi_tenant_firms.sql` creates `firms`/`firm_members`, adds `firm_id` everywhere, seeds **DFEAL** as the first firm, backfills all existing rows and users to it, and replaces the permissive RLS policies. It is idempotent.
2. **Env vars** (Vercel) — see `app/.env.example`. New: `PLATFORM_ADMIN_EMAILS`, optional `ALLOW_SELF_SIGNUP`. Removed: `ALLOWED_EMAIL_DOMAIN`, `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN`, `DIGEST_EMAIL_TO` (now per-firm).
3. **Supabase Auth** — add `https://<your-domain>/auth/callback` to the redirect allow-list; configure SMTP so invite/magic-link emails come from your domain.
4. **Cron** — `POST /api/cron/daily-opportunities` with `Authorization: Bearer $CRON_SECRET` once a day. It ingests, archives, scores every active firm, and emails each firm's digest.
5. **Health** — `GET /api/cron/health` is a public liveness probe; send the cron secret for full diagnostics.

## Commands (`app/`)

```bash
npm run dev            # local dev
npm run check          # typecheck + lint + unit tests
npm run build
npm run pipeline       # full daily pipeline locally (-- --no-email to skip digests)
npm run ingest         # ingest all sources + re-score every firm
npm run firm:onboard -- <firm.json> [owner-email]
```

CI (`.github/workflows/ci.yml`) runs typecheck, lint, tests and build, and applies all migrations twice against Postgres 16 to prove they are idempotent.

## Repository layout

```
├── app/                         Next.js app
│   ├── src/app/(platform)/      firm workspace (explore, opportunities, pursuits, settings…)
│   ├── src/app/admin/           platform-admin firm management
│   ├── src/app/onboarding/      firm onboarding wizard
│   ├── src/app/api/             route handlers (all firm-scoped)
│   ├── src/lib/firms/           firm model, context, validation, industries, prompts
│   ├── src/lib/naics/           NAICS 2022 reference data
│   ├── src/lib/scoring/         per-firm fit scoring
│   ├── src/lib/{ingest,sled,grants,sam-gov}/  source connectors
│   ├── scripts/                 ops CLIs (scripts/research = archived probes, not built)
│   └── templates/               proposal outlines ({{LEGAL_NAME}}, {{SHORT_NAME}}, …)
├── supabase/migrations/         Postgres schema
├── supabase/seed/               example firm JSON
├── client-assets/               firm-supplied reference docs (not served)
└── us-contractor-platform/      original scope docs
```

## Live connectors

| Source | Status |
|---|---|
| SAM.gov | Live |
| Grants.gov, SBA | Live |
| DemandStar (OpenBids) | Live (credentials required) |
| BidBuy IL, Bonfire, Georgia, IL education, State Univ IL | Live |
| OhioBuys | Stub |

## Known follow-ups

- SLED connectors are still Illinois/Georgia-centric; firms in other states rely on SAM, grants and DemandStar until more state portals are added.
- Rate limiting on AI routes is per-instance (in memory); put Vercel WAF or Upstash in front for strict global limits.
- Firm-supplied files (`client-assets/`) should move to per-firm Supabase Storage.
- Reports pages (`/reports/*`) and the automation runner are still placeholders.
