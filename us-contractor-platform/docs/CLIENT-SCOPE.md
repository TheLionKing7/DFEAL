# Client scope — DFEAL LLC internal capture platform

## Product definition

**Internal, single-tenant AI platform** for DFEAL LLC only. Helps the BD team win federal and SLED government contracts by automating discovery, analysis, proposal drafting, and compliance checking.

This is **not** a multi-tenant SaaS. Company identity (UEI, CAGE, NAICS, certifications, past performance) is hardcoded in the system prompt layer and included in every AI call.

## Persona

**DFEAL business development staff** — capture managers, proposal writers, and principals pursuing public sector work.

Primary jobs:

1. Receive **daily hot opportunities** aligned to DFEAL NAICS and capabilities
2. **Analyze solicitations** and get go/no-go scores in minutes
3. **Generate proposal documents** using DFEAL's real credentials
4. **Validate compliance** against Section L/M before submission
5. Get **procurement strategy** advice via AI chat (federal, state, local, education)
6. **Export** finished work as PDF/DOCX

Not in v1: public marketplace, teaming network, competitor graph, auto-submission to portals.

## Geography

| Market | Priority | Data sources |
|--------|----------|--------------|
| **Federal** | P0 | SAM.gov, SBA |
| **State** | P1 | DemandStar, state portals (BidBuy IL, etc.) |
| **Local** | P1 | DemandStar, Bonfire (e.g. Chicago Transit), municipal portals |
| **Education** | P1 | DemandStar, state/cooperative purchasing sites |
| **Ohio** | P1 | OhioBuys / DAS procurement (connector) |
| **Georgia** | P1 | Georgia Procurement Registry / Team Georgia |

Ship **federal + daily surfacing first**, then SLED connectors and AI document modules.

## AI modules

| Module | Description | Phase |
|--------|-------------|-------|
| **Daily hot-opportunity surfacing** | Scheduled job scores new SAM/SLED notices against DFEAL profile; digest to UI + email | 1 |
| **Opportunity Analyzer** | Parse solicitation, score fit, go/no-go recommendation + rationale | 1 |
| **AI Consultant Chat** | Context-aware procurement strategy (page + opp + DFEAL profile) | 2 |
| **Document Generator** | Proposal sections from solicitation + DFEAL credentials | 2 |
| **Compliance Validator** | Section L/M checklist against draft or uploaded proposal | 2 |
| **Procurement strategy** | Embedded in analyzer/chat — market-specific BD guidance | 2–3 |
| **Export (PDF/DOCX)** | Server-side generation + object storage | 2 |

## Entity registration (SAM)

- Lookup by **UEI** or **CAGE** (verify DFEAL's own registration)
- Show legal name, status, expiration, NAICS, PSC
- Alert when SAM registration approaching expiry
- DFEAL profile also stores entity data for AI context (not just lookup UI)

Use **SAM.gov Entity Management API** (server-side only).

## Tenancy & auth

**Single tenant — DFEAL only:**

- No org signup, billing, or multi-customer isolation
- Auth: internal team only (email/password, SSO, or env-gated deploy)
- Multiple DFEAL users optional; same shared company profile

## Build-only constraints

No paid data vendors:

- Federal: SAM.gov + USAspending (free) + Grants.gov (free)
- SLED: DemandStar + portal scrapers/connectors (BidBuy, Bonfire, Ohio, Georgia)
- Enrichment: public sources + DFEAL-provided past performance only

## Success metrics

- Daily digest surfaces ≥1 relevant opportunity without manual SAM search
- Go/no-go decision on a new solicitation in **< 10 minutes**
- First draft proposal section generated in **< 30 minutes** (Phase 2)
- Compliance checklist covers Section L/M items before submission (Phase 2)
- Entity page confirms DFEAL SAM status in one lookup
