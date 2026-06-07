# Supabase setup — DFEAL Capture

## 1. Run the schema

**Option A — SQL Editor (fastest)**

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. Go to **SQL Editor** → **New query**
3. Paste the full contents of `migrations/20250607000000_initial_schema.sql`
4. Click **Run**

**Option B — Supabase CLI**

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

## 2. Environment variables

Add to `app/.env.local` and **Vercel → Settings → Environment Variables**:

```env
# Supabase — Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Postgres direct connection (Settings → Database → Connection string → URI)
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

| Key | Use |
|-----|-----|
| `SUPABASE_SERVICE_ROLE_KEY` | Next.js API routes / cron (bypasses RLS) — **never expose to browser** |
| `NEXT_PUBLIC_SUPABASE_URL` | Client (future auth) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client (future auth) |
| `DATABASE_URL` | Direct Postgres (ingest workers, migrations) |

Use the **Transaction pooler** URL (port `6543`) for serverless/Vercel.

## 3. Storage bucket

The migration creates a private bucket: **`dfeal-documents`** (PDF/DOCX, 50 MB limit).

Verify under **Storage → Buckets** in the dashboard.

## 4. Cron-job.org → Vercel

Point your cron job at:

```
POST https://YOUR_VERCEL_APP.vercel.app/api/cron/daily-opportunities
Header: Authorization: Bearer YOUR_CRON_SECRET
```

Set `CRON_SECRET` in Vercel env vars.

## 5. Tables created

| Table | Purpose |
|-------|---------|
| `opportunities` | Federal + SLED notices (full-text search) |
| `agencies` | SAM + state buyers |
| `sam_entities` | UEI/CAGE lookup cache |
| `opportunity_scores` | Daily hot-opp fit scores |
| `analysis_runs` | AI Analyzer history |
| `generated_documents` | Proposal file metadata |
| `compliance_runs` | Section L/M checks |
| `watchlists` | Saved opportunities |
| `chat_sessions` / `chat_messages` | AI Consultant Chat |
| `ingest_cursors` | SAM/SLED sync state |
| `digest_runs` | Cron run log |
| `opportunity_updates` | Amendments |
| `hot_opportunities` | **View** — latest scored hot opps |

## 6. Verify

In SQL Editor:

```sql
select source, last_sync_at, last_status from ingest_cursors;
select count(*) from opportunities;
```

After ingest is wired, `opportunities` should populate from SAM.gov.

## 7. Cron-job.org

Create a job pointing at your Vercel deployment:

| Field | Value |
|-------|--------|
| URL | `https://YOUR-APP.vercel.app/api/cron/daily-opportunities` |
| Method | `POST` or `GET` |
| Header | `Authorization: Bearer YOUR_CRON_SECRET` |

Set `CRON_SECRET` in Vercel env vars to the same value.

Optional more frequent SAM-only ingest:

`https://YOUR-APP.vercel.app/api/cron/ingest-sam?days=7`

## 8. Verify after first cron run
