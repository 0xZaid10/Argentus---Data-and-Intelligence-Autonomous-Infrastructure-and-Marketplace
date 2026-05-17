import { ExternalLink } from 'lucide-react'
import { BASESCAN_BASE } from '@/config'
import { truncateMiddle } from '@/lib/utils'

export function TxLink({ hash, label }: { hash: string | null | undefined; label?: string }) {
  if (!hash) {
    return <span className="font-mono text-xs text-[var(--text-secondary)]">Unavailable</span>
  }

  return (
    <a
      href={`${BASESCAN_BASE}/${hash}`}
      rel="noreferrer"
      target="_blank"
      className="inline-flex max-w-full min-w-0 items-center gap-1 overflow-hidden font-mono text-xs text-amber-300 transition hover:text-amber-200"
    >
      {label ? <span className="shrink-0">{label}:</span> : null}
      <span className="truncate">{truncateMiddle(hash, 10, 6)}</span>
      <ExternalLink className="h-3 w-3 shrink-0" />
    </a>
  )
}
