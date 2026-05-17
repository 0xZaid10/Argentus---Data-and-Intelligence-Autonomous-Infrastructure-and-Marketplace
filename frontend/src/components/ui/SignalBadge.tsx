import { cn } from '@/lib/utils'

type Signal = 'bullish' | 'bearish' | 'neutral' | null

const styles: Record<Exclude<Signal, null>, string> = {
  bullish: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  bearish: 'bg-red-500/15 text-red-300 border-red-500/25',
  neutral: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
}

const symbols: Record<Exclude<Signal, null>, string> = {
  bullish: '▲',
  bearish: '▼',
  neutral: '●',
}

export function SignalBadge({ signal }: { signal: Signal }) {
  if (!signal) {
    return <span className="inline-flex rounded-full border border-white/8 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">No Signal</span>
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em]',
        styles[signal],
      )}
    >
      <span>{symbols[signal]}</span>
      {signal}
    </span>
  )
}
