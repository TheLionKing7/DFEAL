/**
 * Marketing landing — adapt from ProcureIQ apps/web/app/(marketing)/page.tsx
 * Replace copy with client brand. Keep: hero, platform section, agents, footer.
 */
export function LandingPagePlaceholder() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-24 text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-gold">Federal · State · Local · Education</p>
      <h1 className="mt-4 text-4xl font-bold text-text">
        Win more contracts with <span className="text-gold">DFEAL AI</span>
      </h1>
      <p className="mx-auto mt-4 max-w-lg text-text-muted">
        Internal platform for DFEAL LLC — daily hot opportunities, go/no-go analysis, proposal generation, and compliance validation.
      </p>
    </div>
  );
}
