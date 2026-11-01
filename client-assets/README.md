# Client assets (not served)

Reference documents supplied by onboarded firms (capability statements, past
proposals). They used to live in `app/public/templates/`, which made them
downloadable by **any** signed-in user — a cross-tenant leak once multiple
firms share the platform. They now live outside the Next.js `public/` folder.

Long term these belong in a per-firm Supabase Storage prefix
(`firm-files/<firm_id>/…`) rather than in git.
