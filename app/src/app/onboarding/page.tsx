import Link from "next/link";
import { redirect } from "next/navigation";
import { OnboardFirmForm } from "@/components/firm/OnboardFirmForm";
import { SMART_CAPTURE } from "@/config/platform";
import { resolveFirmContext } from "@/lib/firms/context";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const ctx = await resolveFirmContext();
  if (ctx.status === "unauthenticated") redirect("/login?next=/onboarding");
  if (ctx.status === "unconfigured") redirect("/setup-required");

  const isAdmin = ctx.user.isPlatformAdmin;
  const selfServe = process.env.ALLOW_SELF_SIGNUP === "1" && ctx.status === "no_firm";
  if (ctx.status === "ok" && !isAdmin) redirect("/explore");

  if (!isAdmin && !selfServe) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-md rounded-2xl border border-border bg-bg-surface p-8 text-sm shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-gold">{SMART_CAPTURE.name}</p>
          <h1 className="mt-2 text-xl font-bold">No firm workspace yet</h1>
          <p className="mt-3 text-text-muted">
            You are signed in as <strong>{ctx.user.email}</strong>, but this account is not attached to a firm.
            Ask your firm administrator to add you under <em>Firm profile → Team</em>, or contact the Smart
            Capture team to onboard your firm.
          </p>
          <form action="/auth/signout" method="post" className="mt-6">
            <button className="rounded-lg border border-border px-4 py-2 hover:bg-bg">Sign out</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-gold">{SMART_CAPTURE.name}</p>
        <h1 className="text-2xl font-bold">Onboard a firm</h1>
        <p className="text-sm text-text-muted">
          Pick an industry to pre-fill suggested NAICS codes and keywords, then tailor them. Once saved, the
          current opportunity pool is scored for the firm immediately and it is included in every daily ingest.
        </p>
        {isAdmin && (
          <p className="text-sm">
            <Link href="/admin/firms" className="text-gold hover:underline">
              ← Back to all firms
            </Link>
          </p>
        )}
      </header>
      <OnboardFirmForm showOwnerEmail={isAdmin} />
    </div>
  );
}
