import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { SMART_CAPTURE } from "@/config/platform";
import { resolveFirmContext } from "@/lib/firms/context";
import { getPendingInvitation } from "@/lib/onboarding/invitations";
import { getUserProfile } from "@/lib/onboarding/profile";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const ctx = await resolveFirmContext();
  if (ctx.status === "unauthenticated") redirect("/login?next=/onboarding");
  if (ctx.status === "unconfigured") redirect("/setup-required");

  const [invitation, profile] = await Promise.all([
    getPendingInvitation(ctx.user.email),
    getUserProfile(ctx.user.email),
  ]);

  if (!invitation) {
    if (ctx.user.isPlatformAdmin) redirect("/admin/firms/new");
    if (ctx.status === "ok") redirect("/explore");
    if (process.env.ALLOW_SELF_SIGNUP !== "1") {
      return (
        <div className="flex min-h-full flex-col items-center justify-center px-6 py-16">
          <div className="w-full max-w-md rounded-2xl border border-border bg-bg-surface p-8 text-sm shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-gold">{SMART_CAPTURE.name}</p>
            <h1 className="mt-2 text-xl font-bold">Invitation required</h1>
            <p className="mt-3 text-text-muted">
              You are signed in as <strong>{ctx.user.email}</strong>. Smart Capture workspaces are set up by
              invitation. If your firm already uses Smart Capture, ask its administrator to add you under{" "}
              <em>Firm profile &amp; settings → Team</em>; otherwise contact the Smart Capture team for an invitation.
            </p>
            <form action="/auth/signout" method="post" className="mt-6">
              <button className="rounded-lg border border-border px-4 py-2 hover:bg-bg">Sign out</button>
            </form>
          </div>
        </div>
      );
    }
  }

  return (
    <OnboardingWizard
      email={ctx.user.email}
      companyName={invitation?.company_name}
      initialProfile={
        profile ? { fullName: profile.full_name, jobTitle: profile.job_title, phone: profile.phone } : null
      }
    />
  );
}
