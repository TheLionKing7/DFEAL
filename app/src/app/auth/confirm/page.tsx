import { SMART_CAPTURE } from "@/config/platform";
import { VERIFY_TYPES, safeNextPath } from "@/lib/auth/sign-in-link";

export const dynamic = "force-dynamic";

/**
 * Landing page for emailed sign-in links. The token is only redeemed when the
 * user presses Continue (POST), so email link scanners can't use it up.
 */
export default async function ConfirmSignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const tokenHash = str("token_hash");
  const type = str("type");
  const next = safeNextPath(str("next"));
  const valid = Boolean(tokenHash) && (VERIFY_TYPES as readonly string[]).includes(type);

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-bg-surface p-8 text-center shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-gold">{SMART_CAPTURE.name}</p>
        {valid ? (
          <form method="post" action="/auth/verify" className="mt-4 space-y-5">
            <h1 className="text-xl font-semibold">Continue to your workspace</h1>
            <p className="text-sm text-text-muted">Press continue to finish signing in.</p>
            <input type="hidden" name="token_hash" value={tokenHash} />
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="next" value={next} />
            <button type="submit" className="w-full rounded-lg bg-sidebar px-4 py-3 text-sm font-semibold text-white">
              Continue
            </button>
          </form>
        ) : (
          <div className="mt-4 space-y-4">
            <h1 className="text-xl font-semibold">This sign-in link is incomplete</h1>
            <a href="/login" className="inline-block rounded-lg bg-sidebar px-4 py-2.5 text-sm font-semibold text-white">
              Request a new link
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
