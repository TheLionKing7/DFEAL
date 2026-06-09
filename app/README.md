# Smart Capture — Next.js app

Production application for DFEAL LLC. Parent repo status and phase roadmap: [../README.md](../README.md).

## Quick start

```bash
cp .env.example .env.local   # fill in keys (never commit .env.local)
npm install
npm run dev
```

Open [http://localhost:3000/explore](http://localhost:3000/explore) after signing in.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run ingest` | Run daily pipeline locally |
| `npx tsx scripts/test-demandstar-ingest.ts` | Test DemandStar connector |
| `npx tsx scripts/probe-sam-dfeal.ts` | Probe SAM entity for DFEAL |

## Key paths

- `src/config/dfeal-profile.ts` — company identity for scoring and AI
- `src/lib/ingest/` — SAM, SLED, grants ingest
- `src/lib/cron/daily-pipeline.ts` — daily hot-opportunity job
- `src/app/api/cron/` — Vercel cron endpoints
