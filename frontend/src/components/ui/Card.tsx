import type { HTMLAttributes, PropsWithChildren } from 'react'
import { cn } from '@/lib/utils'

export function Card({ children, className, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cn(
        'relative min-w-0 overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface-1),rgba(17,17,19,0.76))] p-6 shadow-[var(--shadow-card)] backdrop-blur md:p-7',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
