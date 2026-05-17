import { cn } from '@/lib/utils'

export function ConfidenceBar({ score }: { score: number | null | undefined }) {
  const value = Math.max(0, Math.min(score ?? 0, 1))
  const tone = value >= 0.7 ? 'bg-emerald-400' : value >= 0.4 ? 'bg-amber-400' : 'bg-red-400'

  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/6">
        <div className={cn('h-full rounded-full transition-all duration-500', tone)} style={{ width: `${value * 100}%` }} />
      </div>
      <span className="font-mono text-xs text-[var(--text-secondary)]">{(value * 100).toFixed(0)}%</span>
    </div>
  )
}
