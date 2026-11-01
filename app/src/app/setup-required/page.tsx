export default function SetupRequiredPage() {
  return (
    <div className="flex min-h-full items-center justify-center px-6 py-16">
      <div className="max-w-lg rounded-2xl border border-border bg-bg-surface p-8 text-sm shadow-sm">
        <h1 className="text-xl font-bold">Database not configured</h1>
        <p className="mt-3 text-text-muted">
          Set <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code>, run the migrations in <code>supabase/migrations</code>, and
          redeploy. See the README “Deployment” section.
        </p>
      </div>
    </div>
  );
}
