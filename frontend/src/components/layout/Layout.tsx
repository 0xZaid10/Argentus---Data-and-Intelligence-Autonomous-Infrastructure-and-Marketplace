import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, Send, X } from 'lucide-react'
import { useState, type PropsWithChildren } from 'react'
import { Link, useLocation } from 'wouter'
import { APP_COPY } from '@/config'
import { DEMO_AGENTS } from '@/lib/demo-data'
import { createTask, fetchAgentStatus } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/tech', label: 'Tech' },
  { href: '/docs', label: 'Docs' },
]

function NavLink({ href, label, onClick }: { href: string; label: string; onClick?: () => void }) {
  const [location] = useLocation()
  const active = location === href

  return (
    <Link
      className={cn(
        'rounded-full px-4 py-2 text-sm transition',
        active
          ? 'bg-[var(--surface-3)] text-[var(--text-primary)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]',
      )}
      href={href}
      onClick={onClick}
    >
      {label}
    </Link>
  )
}

export default function Layout({ children }: PropsWithChildren) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [, navigate] = useLocation()
  const queryClient = useQueryClient()

  const agentsQuery = useQuery({
    queryKey: ['agents'],
    queryFn: fetchAgentStatus,
    refetchInterval: 30_000,
  })

  const createTaskMutation = useMutation({
    mutationFn: (value: string) => createTask(value),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setDescription('')
      setSubmitOpen(false)
      navigate(`/tasks/${task.id}`)
    },
  })

  const agentData = agentsQuery.data ?? (agentsQuery.isError ? DEMO_AGENTS : [])
  const activeAgents = agentData.filter((agent) => agent.status === 'active').length
  const agentsOnline = agentsQuery.isSuccess
  const statusLabel = agentsOnline ? `${activeAgents} Agents Active` : 'Agents Offline'
  const botHref = 'https://t.me/agent_mesh_coordinator_bot'

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[rgba(10,10,11,0.82)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[90rem] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-8 lg:px-8">
          <div className="min-w-0 lg:justify-self-start">
            <Link className="group flex min-w-0 items-center gap-3" href="/">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.15rem] border border-amber-500/30 bg-amber-500/10 shadow-[0_0_36px_rgba(245,158,11,0.16)]">
                <span className="font-display text-2xl font-black text-[var(--accent-gold)]">A</span>
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-[1.9rem] font-black leading-none tracking-[-0.07em] text-[var(--text-primary)]">
                  {APP_COPY.title}
                </p>
                <p className="truncate font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--accent-gold)]">
                  {APP_COPY.subtitle}
                </p>
              </div>
            </Link>
          </div>

          <nav className="hidden items-center justify-self-center rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-1.5 shadow-[var(--shadow-soft)] lg:flex">
            {navItems.map((item) => (
              <NavLink href={item.href} key={item.href} label={item.label} />
            ))}
          </nav>

          <div className="hidden items-center justify-self-end gap-3 lg:flex">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-xs text-[var(--text-secondary)]">
              <span className={cn('h-2 w-2 rounded-full', agentsOnline ? 'bg-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.6)]' : 'bg-white/35')} />
              <span>{statusLabel}</span>
            </div>

            <a
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-xs text-[var(--text-primary)] transition hover:border-[var(--accent-gold-dim)] hover:text-[var(--accent-gold)]"
              href={botHref}
              rel="noreferrer"
              target="_blank"
            >
              <span>Bot</span>
              <span className="font-mono">@agent_mesh_coordinator_bot</span>
            </a>

            <Button onClick={() => setSubmitOpen(true)} size="sm">
              <Send className="h-4 w-4" />
              Submit Task
            </Button>
          </div>

          <button
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="rounded-full border border-[var(--border)] p-2 text-[var(--text-primary)] lg:hidden"
            onClick={() => setMenuOpen((current) => !current)}
            type="button"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <AnimatePresence>
          {menuOpen ? (
            <motion.div
              animate={{ opacity: 1, height: 'auto' }}
              className="border-t border-[var(--border)] bg-[rgba(10,10,11,0.96)] px-4 py-4 lg:hidden"
              exit={{ opacity: 0, height: 0 }}
              initial={{ opacity: 0, height: 0 }}
            >
              <div className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <NavLink href={item.href} key={item.href} label={item.label} onClick={() => setMenuOpen(false)} />
                ))}
                <div className="mt-3 grid gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-xs text-[var(--text-secondary)]">
                    <span className={cn('h-2 w-2 rounded-full', agentsOnline ? 'bg-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.6)]' : 'bg-white/35')} />
                    <span>{statusLabel}</span>
                  </div>
                  <a
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-primary)] transition hover:border-[var(--accent-gold-dim)] hover:text-[var(--accent-gold)]"
                    href={botHref}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span>Bot</span>
                    <span className="font-mono">@agent_mesh_coordinator_bot</span>
                  </a>
                  <Button
                    onClick={() => {
                      setMenuOpen(false)
                      setSubmitOpen(true)
                    }}
                    size="sm"
                  >
                    <Send className="h-4 w-4" />
                    Submit Task
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      <main className="mx-auto max-w-[90rem] px-4 py-10 sm:px-6 md:py-12 lg:px-8 lg:py-14">{children}</main>

      <footer className="border-t border-[var(--border)] py-8">
        <div className="mx-auto flex max-w-[90rem] flex-col gap-4 px-4 text-sm text-[var(--text-secondary)] sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p>Argentus connects requesters, verifiers, and contributors through permanent storage and trustless settlement.</p>
          <div className="flex items-center gap-3">
            <span className="font-mono">Base Sepolia</span>
            <span className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
            <span className="font-mono">Filecoin Mainnet</span>
          </div>
        </div>
      </footer>

      <Modal
        description="Create a new intelligence task and route it directly into the Argentus pipeline."
        onOpenChange={setSubmitOpen}
        open={submitOpen}
        title="Submit Task"
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            createTaskMutation.mutate(description)
          }}
        >
          <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
            What do you want to research?
            <textarea
              className="min-h-32 rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-gold-dim)]"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="analyze BTC whale accumulation today"
              required
              value={description}
            />
          </label>

          {createTaskMutation.isError ? (
            <p className="text-sm text-red-300" role="alert">
              {createTaskMutation.error.message}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button disabled={!description.trim() || createTaskMutation.isPending} type="submit">
              {createTaskMutation.isPending ? 'Submitting...' : 'Research Now'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
