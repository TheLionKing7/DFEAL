# DFEAL company profile — data to collect

This information is **baked into every AI call** and used for daily opportunity scoring. Provide accurate, current data.

## Entity (SAM)

| Field | Example | Required |
|-------|---------|----------|
| Legal name | DFEAL LLC | Yes |
| UEI | 12-character SAM UEI | Yes |
| CAGE | 5-character code | Yes |
| SAM registration expiration | YYYY-MM-DD | Yes |
| SAM status | Active / Expired | Yes |
| Primary NAICS | e.g. 541512 | Yes |
| Secondary NAICS | comma-separated | Recommended |
| PSC codes | if applicable | Optional |

## Certifications

List all that apply:

- 8(a)
- HUBZone
- SDVOSB / VOSB
- WOSB / EDWOSB
- Small business (SBA)
- State/local certifications

## Capabilities

| Field | Notes |
|-------|-------|
| Capability statement | 1–2 page narrative (paste or file path) |
| Core competencies | Bullet list for scoring |
| Differentiators | What sets DFEAL apart |
| Geographic focus | States/regions of interest |
| Contract size range | Min / max estimated value |

## Past performance (3–5 contracts minimum)

For each:

- Contract name / number
- Customer agency
- Period of performance
- Contract value (optional)
- Scope summary (2–4 sentences)
- NAICS / type of work

## Go / no-go criteria

Rules the Analyzer and daily surfacing job should enforce:

- Minimum contract value
- Preferred set-asides (or exclusions)
- Agencies to prioritize or avoid
- Required certifications for a bid
- Maximum travel / OCONUS restrictions
- Deadline buffer (e.g. skip if < 7 days to respond)

## Personnel (optional for proposals)

Key personnel for Document Generator:

- Name, title, role on proposals
- Brief bio / qualifications

## Branding (UI)

| Field | Current placeholder |
|-------|---------------------|
| Product name | CaptureOS → **DFEAL** (confirm) |
| Tagline | Procurement Intelligence Layer → confirm |

## Where this lives in code

1. Copy `config/dfeal-profile.example.ts` → `config/dfeal-profile.ts`
2. Add `dfeal-profile.ts` to `.gitignore`
3. `buildDfealSystemPrompt()` serializes the above for LLM system messages
4. `getDfealScoringCriteria()` drives the daily hot-opportunity job

Send completed values to the dev team or fill the config file directly in the repo (never commit secrets to git).
