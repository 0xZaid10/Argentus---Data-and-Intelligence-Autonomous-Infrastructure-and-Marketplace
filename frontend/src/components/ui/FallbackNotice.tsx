import { Activity, DatabaseZap } from 'lucide-react'
import { cn } from '@/lib/utils'

export function FallbackNotice({
  className,
  compact = false,
  message = 'Live backend unavailable. Showing demo network data until the local services respond.',
}: {
  className?: string
  compact?: boolean
  message?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-[1.5rem] border border-amber-500/20 bg-[linear-gradient(180deg,rgba(245,158,11,0.12),rgba(17,17,19,0.86))] px-4 py-3 text-sm text-amber-100/90 shadow-[0_12px_34px_rgba(245,158,11,0.08)]',
        compact && 'rounded-full px-3 py-2 text-xs',
        className,
      )}
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/12 text-[var(--accent-gold)]">
        {compact ? <Activity className="h-4 w-4" /> : <DatabaseZap className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn('font-medium text-amber-100', compact && 'text-xs')}>Demo mode active</p>
        <p className={cn('text-amber-50/75', compact && 'hidden sm:block')}>{message}</p>
      </div>
    </div>
  )
}
