import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 px-6 py-24 text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-gold">404</p>
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-sm text-text-muted">The page or opportunity you are looking for does not exist or has been archived.</p>
      <Link href="/explore" className="mt-4 rounded-lg bg-sidebar px-5 py-2 text-sm text-white hover:bg-sidebar-surface">
        Back to Explore
      </Link>
    </div>
  );
}
