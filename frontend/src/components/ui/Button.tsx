import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-[var(--accent-gold)] text-black hover:bg-[var(--accent-gold-strong)] shadow-[0_0_30px_rgba(245,158,11,0.18)]',
  secondary:
    'border border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--text-primary)] hover:border-[var(--accent-gold-dim)] hover:bg-[var(--surface-3)]',
  ghost: 'bg-transparent text-[var(--text-primary)] hover:bg-[var(--surface-2)]',
  danger: 'bg-[rgba(239,68,68,0.15)] text-[var(--red)] hover:bg-[rgba(239,68,68,0.22)]',
}

const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
}

export function Button({
  children,
  className,
  size = 'md',
  variant = 'primary',
  type = 'button',
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold tracking-[-0.01em] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      type={type}
      {...props}
    >
      {children}
    </button>
  )
}
