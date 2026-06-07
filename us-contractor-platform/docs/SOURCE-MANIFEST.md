# ProcureIQ → transfer pack source manifest

Use this when you need to compare behavior in the original repo. **Do not import ProcureIQ as a dependency.**

## Layout & shell

| Transfer file | Inspired by |
|---------------|-------------|
| `components/layout/DashboardShell.tsx` | `apps/web/components/layout/DashboardShell.tsx` |
| `components/layout/Header.tsx` | `apps/web/components/layout/Header.tsx` |
| `components/layout/Sidebar.tsx` | `apps/web/components/layout/Sidebar.tsx` (nav items US-adapted) |

## Opportunity detail (GovTribe-style)

| Transfer file | Inspired by |
|---------------|-------------|
| `components/opportunity/OpportunitySectionTabs.tsx` | `apps/web/components/opportunity/OpportunitySectionTabs.tsx` |
| `components/opportunity/OpportunityContractHeader.tsx` | `apps/web/components/opportunity/OpportunityContractHeader.tsx` |
| `components/opportunity/OpportunityDetailShell.tsx` | `apps/web/components/opportunity/OpportunityDetailClient.tsx` (structure only) |
| `components/opportunity/panels/` | `apps/web/components/opportunity/panels/*` (stubs listed in folder) |

## AI assistant

| Transfer file | Inspired by |
|---------------|-------------|
| `components/assistant/AssistantContext.tsx` | `apps/web/components/assistant/AssistantContext.tsx` |
| `components/assistant/PageContextProvider.tsx` | `apps/web/components/assistant/PageContextProvider.tsx` |
| `components/assistant/AssistantWorkspace.tsx` | `apps/web/components/assistant/ProcureIQAssistantPage.tsx` |
| `shared/assistant-page-context.ts` | `packages/shared/src/assistant-page-context.ts` |

## Marketing

| Transfer file | Inspired by |
|---------------|-------------|
| `components/marketing/LandingPage.tsx` | `apps/web/app/(marketing)/page.tsx` |
| `components/marketing/MarketingHeader.tsx` | `apps/web/components/marketing/MarketingHeader.tsx` |
| `components/marketing/MarketingFooter.tsx` | `apps/web/components/marketing/MarketingFooter.tsx` |
| `components/brand/Logo.tsx` | `apps/web/components/brand/ProcureIQLogo.tsx` (rename brand) |

## Design tokens

| Transfer file | Inspired by |
|---------------|-------------|
| `design/globals.css` | `apps/web/app/globals.css` |
| `design/tailwind.extend.snippet.ts` | `apps/web/tailwind.config.ts` colors |

## Backend patterns (reference only — reimplement in new repo)

| Concept | ProcureIQ location |
|---------|-------------------|
| Assistant + page context API | `apps/api/src/routes/agents.ts`, `packages/agents/src/procureiq-assistant.ts` |
| Opportunity contacts | `apps/api/src/lib/opportunity-contacts.ts` (US: SAM point of contact fields) |

## Explicitly excluded from transfer

- Nigeria MDA intelligence, Trace agent, NOCOPO ingest
- OnFrontiers expert finder (optional US partner later)
- Supabase migrations in `supabase/migrations/*`
- `@procureiq/*` package names
