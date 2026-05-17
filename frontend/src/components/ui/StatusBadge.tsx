import { cn, toTitleCase } from '@/lib/utils'

const colors: Record<string, string> = {
  pending: 'bg-white/8 text-white/70',
  in_progress: 'bg-blue-500/15 text-blue-300',
  verifying: 'bg-amber-500/15 text-amber-300',
  completed: 'bg-emerald-500/15 text-emerald-300',
  failed: 'bg-red-500/15 text-red-300',
  rejected: 'bg-red-500/15 text-red-300',
  open: 'bg-blue-500/15 text-blue-300',
  reviewing: 'bg-amber-500/15 text-amber-300',
  approved: 'bg-emerald-500/15 text-emerald-300',
  idle: 'bg-white/8 text-white/65',
  active: 'bg-emerald-500/15 text-emerald-300',
  error: 'bg-red-500/15 text-red-300',
}

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) {
    return null
  }

  const glow = status === 'in_progress' || status === 'verifying' || status === 'reviewing'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-white/8 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em]',
        colors[status] ?? 'bg-white/8 text-white/70',
        glow && 'animate-pulse',
      )}
    >
      {toTitleCase(status)}
    </span>
  )
}
