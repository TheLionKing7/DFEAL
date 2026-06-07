# Suggested Next.js App Router map — DFEAL

## Public (optional for internal v1)

Internal deploy may skip marketing and gate entire app behind auth.

| Route | Component source |
|-------|------------------|
| `/` | Redirect → `/explore` (authenticated) or `components/marketing/LandingPage.tsx` |
| `/login` | Internal team auth |
| `/privacy` | static (if external-facing) |

## Authenticated (dashboard layout)

Use `components/layout/DashboardShell.tsx` as `(dashboard)/layout.tsx`.

| Route | Purpose |
|-------|---------|
| `/explore` | Home — daily hot opps, lanes, stats |
| `/opportunities` | All opportunities (table/cards) |
| `/opportunities?lane=federal` | Federal (SAM) |
| `/opportunities?lane=state` | State |
| `/opportunities?lane=local` | Local |
| `/opportunities?lane=education` | Education |
| `/opportunities?lane=ohio` | Ohio (state connector) |
| `/opportunities?lane=georgia` | Georgia (state connector) |
| `/opportunities/[id]` | Detail — `OpportunityDetailShell` + Analyze CTA |
| `/opportunities/[id]/analyze` | Full Opportunity Analyzer view |
| `/opportunities/[id]/documents` | Document Generator workspace |
| `/opportunities/[id]/compliance` | Compliance Validator |
| `/agencies` | Agency list |
| `/agencies/[id]` | Agency profile + open opps |
| `/entity` | SAM UEI/CAGE lookup (DFEAL + others) |
| `/watchlist` | Saved opportunities |
| `/documents` | All generated exports |
| `/settings` | Alert prefs, digest schedule (profile is config file in v1) |

## API routes

| Route | Method | Notes |
|-------|--------|-------|
| `/api/opportunities` | GET | search, filter, paginate; `?hot=true` for daily picks |
| `/api/opportunities/[id]` | GET | detail + updates |
| `/api/opportunities/[id]/similar` | GET | NAICS + agency match |
| `/api/opportunities/[id]/analyze` | POST | Opportunity Analyzer (LLM + DFEAL profile) |
| `/api/documents` | GET/POST | list / generate proposal sections |
| `/api/documents/[id]/export` | POST | PDF or DOCX |
| `/api/compliance` | POST | validate doc against Section L/M |
| `/api/agencies/[id]` | GET | agency + stats |
| `/api/entity` | GET | `?uei=` or `?cage=` |
| `/api/watchlist` | GET/POST/DELETE | |
| `/api/assistant` | POST | AI Consultant Chat — message + page_context |
| `/api/cron/daily-opportunities` | POST | Secured cron — score + digest |

## Middleware

- Internal v1: require auth on all routes except `/login`
- Redirect authenticated `/` → `/explore`

Pattern from ProcureIQ `apps/web/middleware.ts` (adapt paths).
