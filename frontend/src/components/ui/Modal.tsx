import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { PropsWithChildren, ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  trigger?: ReactNode
}

export function Modal({ children, description, onOpenChange, open, title, trigger }: PropsWithChildren<ModalProps>) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,42rem)] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-[var(--border-strong)] bg-[var(--surface-1)] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.5)] focus:outline-none">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-display text-2xl text-[var(--text-primary)]">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-2 text-sm text-[var(--text-secondary)]">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close asChild>
              <button
                aria-label="Close dialog"
                className="rounded-full border border-[var(--border)] p-2 text-[var(--text-secondary)] transition hover:border-[var(--accent-gold-dim)] hover:text-[var(--text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
