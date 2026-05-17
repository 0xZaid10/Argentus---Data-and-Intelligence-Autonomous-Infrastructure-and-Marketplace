import type { ReactNode } from 'react'

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-8 flex flex-col gap-5 md:mb-10 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 max-w-4xl">
        {eyebrow ? (
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--accent-gold)]">{eyebrow}</p>
        ) : null}
        <h2 className="mt-3 max-w-4xl font-display text-3xl font-bold leading-[0.98] text-[var(--text-primary)] md:text-[2.85rem]">
          {title}
        </h2>
        {description ? <p className="mt-4 max-w-3xl text-sm leading-8 text-[var(--text-secondary)]">{description}</p> : null}
      </div>
      {action ? <div className="md:shrink-0">{action}</div> : null}
    </div>
  )
}
