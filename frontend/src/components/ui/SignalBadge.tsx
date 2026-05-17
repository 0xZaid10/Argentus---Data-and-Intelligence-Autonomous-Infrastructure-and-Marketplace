import { cn } from '@/lib/utils'

type Signal = 'bullish' | 'bearish' | 'neutral' | null

const styles: Record<Exclude<Signal, null>, string> = {
  bullish: 'border-emerald-500/25 bg-emerald-500/15 text-emerald-300',
  bearish: 'border-red-500/25 bg-red-500/15 text-red-300',
  neutral: 'border-amber-500/25 bg-amber-500/15 text-amber-300',
}

const symbols: Record<Exclude<Signal, null>, string> = {
  bullish: '▲',
  bearish: '▼',
  neutral: '●',
}

export function SignalBadge({ signal }: { signal: Signal }) {
  if (!signal) {
    return null
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
