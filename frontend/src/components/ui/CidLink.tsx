import { ExternalLink } from 'lucide-react'
import { IPFS_GATEWAY } from '@/config'
import { truncateMiddle } from '@/lib/utils'

export function CidLink({ cid }: { cid: string | null | undefined }) {
  if (!cid) {
    return <span className="font-mono text-xs text-[var(--text-secondary)]">Unavailable</span>
  }

  return (
    <a
      href={`${IPFS_GATEWAY}/${cid}`}
      rel="noreferrer"
      target="_blank"
      className="inline-flex max-w-full min-w-0 items-center gap-1 overflow-hidden font-mono text-xs text-sky-300 transition hover:text-sky-200"
    >
      <span className="truncate">{truncateMiddle(cid, 20, 6)}</span>
      <ExternalLink className="h-3 w-3 shrink-0" />
    </a>
  )
}
