# Opportunity detail panels — implement in new repo

Create one file per tab, wired from `OpportunityDetailShell`:

| Panel file | GovTribe / ProcureIQ reference |
|------------|--------------------------------|
| `OverviewPanel.tsx` | AI summary, quick actions, key dates |
| `ContactsPanel.tsx` | SAM point of contact fields |
| `SimilarPanel.tsx` | Same NAICS + agency |
| `FilesPanel.tsx` | SAM attachment links |
| `UpdatesPanel.tsx` | Amendments from ingest |

ProcureIQ sources: `apps/web/components/opportunity/panels/*.tsx`

US-specific: drop Teaming/OnFrontiers unless client adds partners later.
