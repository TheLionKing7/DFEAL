# DFEAL implementation checklist

## Phase 0 — Foundation

- [ ] Read `README.md`, `docs/CLIENT-SCOPE.md`, `docs/DFEAL-COMPANY-PROFILE.md`
- [ ] DFEAL team provides UEI, CAGE, NAICS, capability statement, past performance
- [ ] Copy `config/dfeal-profile.example.ts` → `dfeal-profile.ts` (gitignored)
- [ ] Scaffold Next.js 14+ + Postgres (see README quick start)
- [ ] Copy `design/` → Tailwind + globals
- [ ] Copy `shared/` → `src/shared/`
- [ ] Copy `components/` → fix imports (`@/shared/cn` etc.)
- [ ] Rebrand Sidebar: CaptureOS → DFEAL Capture (or confirmed name)

## Phase 1 — Federal + daily surfacing

- [ ] Obtain `SAM_GOV_API_KEY`
- [ ] Copy `lib/sam-gov/` → implement real SAM client (stubs provided)
- [ ] Build ingest worker **before** UI search
- [ ] Implement daily hot-opportunity scorer using `getDfealScoringCriteria()`
- [ ] Scaffold routes from `docs/ROUTE-MAP.md`
- [ ] Opportunity Analyzer API (`/api/opportunities/[id]/analyze`)
- [ ] Entity lookup page at `/entity`
- [ ] Watchlist + daily digest email (optional Resend)

## Phase 2 — AI documents & compliance

- [ ] LLM provider wired (`OPENAI_API_KEY` or `ANTHROPIC_API_KEY`)
- [ ] Document Generator (`/api/documents`)
- [ ] Compliance Validator (`/api/compliance`)
- [ ] PDF/DOCX export + object storage (S3/R2)
- [ ] Port full assistant logic into `AssistantWorkspace` (AI Consultant Chat)
- [ ] DFEAL provides redacted proposal templates + Section L/M samples

## Phase 3 — SLED connectors

- [ ] DemandStar connector (see `docs/SLED-CONNECTORS.md`)
- [ ] Illinois: BidBuy, Bonfire (Chicago Transit)
- [ ] Ohio + Georgia (see `docs/STATE-CONNECTORS-OH-GA.md`)
- [ ] Lanes: State · Local · Education in Explore UI

## Do not

- [ ] Depend on `@procureiq/*` packages
- [ ] Commit `dfeal-profile.ts` or API keys
- [ ] Build multi-tenant signup/billing in v1

## Optional: ProcureIQ parity

For 100% parity on AI assistant UI, copy from ProcureIQ and rebrand — see `docs/SOURCE-MANIFEST.md`.
