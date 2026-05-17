export function LoadingPanel({ label = 'Loading Argentus data...' }: { label?: string }) {
  return (
    <div aria-busy="true" className="rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-8">
      <div className="flex items-center gap-3">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--accent-gold)]" />
        <p className="text-sm text-[var(--text-secondary)]">{label}</p>
      </div>
    </div>
  )
}
