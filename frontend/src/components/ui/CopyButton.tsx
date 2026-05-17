import { Copy, CopyCheck } from 'lucide-react'
import { useState } from 'react'

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <button
      aria-label={`Copy ${label}`}
      className="rounded-full border border-[var(--border)] p-2 text-[var(--text-secondary)] transition hover:border-[var(--accent-gold-dim)] hover:text-[var(--text-primary)]"
      onClick={onCopy}
      type="button"
    >
      {copied ? <CopyCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}
