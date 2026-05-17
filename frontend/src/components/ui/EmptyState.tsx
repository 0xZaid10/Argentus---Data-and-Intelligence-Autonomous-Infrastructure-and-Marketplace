import { Card } from './Card'

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card className="border-dashed border-[var(--border-strong)] text-center">
      <p className="font-display text-2xl text-[var(--text-primary)]">{title}</p>
      <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--text-secondary)]">{body}</p>
    </Card>
  )
}
