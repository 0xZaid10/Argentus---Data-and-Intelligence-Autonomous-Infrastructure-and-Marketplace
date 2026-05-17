import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, Menu, Moon, Send, SunMedium, Wallet, X } from 'lucide-react'
import { useState, type PropsWithChildren } from 'react'
import { Link, useLocation } from 'wouter'
import { APP_COPY } from '@/config'
import { useTheme } from '@/hooks/useTheme'
import { useWallet } from '@/hooks/useWallet'
import { DEMO_AGENTS } from '@/lib/demo-data'
import { createTask, fetchAgentStatus } from '@/lib/api'
import { cn, truncateMiddle } from '@/lib/utils'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/tech', label: 'Tech Stack' },
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
  const { theme, toggleTheme } = useTheme()
  const { address, connect, error: walletError, isConnecting } = useWallet()

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

  const agentData = agentsQuery.data ?? (agentsQuery.isError ? DEMO_AGENTS : undefined)
  const activeAgents = agentData?.filter((agent) => agent.status === 'active').length ?? (agentsQuery.isLoading ? 4 : 0)
  const statusLabel = agentsQuery.isLoading && !agentData ? 'Checking agents...' : `${activeAgents} agents active`

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[rgba(10,10,11,0.75)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[90rem] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-8 lg:px-8">
          <div className="min-w-0 lg:justify-self-start">
            <Link className="group flex min-w-0 items-center gap-3" href="/">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.1rem] border border-amber-500/30 bg-amber-500/10 shadow-[0_0_34px_rgba(245,158,11,0.16)] transition group-hover:scale-[1.02]">
                <span className="font-display text-2xl font-extrabold text-[var(--accent-gold)]">A</span>
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-[1.85rem] font-extrabold leading-none text-[var(--text-primary)]">
                  {APP_COPY.title}
                </p>
                <p className="truncate font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--text-secondary)]">
                  Decentralized intelligence
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
            <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-xs text-[var(--text-secondary)] shadow-[0_10px_28px_rgba(0,0,0,0.14)]">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.6)]" />
              <Bot className="h-3.5 w-3.5 text-[var(--accent-gold)]" />
              <span>{statusLabel}</span>
            </div>

            <Button onClick={connect} size="sm" variant="secondary">
              <Wallet className="h-4 w-4" />
              {address ? truncateMiddle(address) : isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </Button>

            <Button onClick={() => setSubmitOpen(true)} size="sm">
              <Send className="h-4 w-4" />
              Submit Task
            </Button>

            <button
              aria-label="Toggle theme"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] transition hover:border-[var(--accent-gold-dim)] hover:text-[var(--text-primary)]"
              onClick={toggleTheme}
              type="button"
            >
              {theme === 'dark' ? <Moon className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
            </button>
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
              className="border-t border-[var(--border)] bg-[rgba(10,10,11,0.94)] px-4 py-4 lg:hidden"
              exit={{ opacity: 0, height: 0 }}
              initial={{ opacity: 0, height: 0 }}
            >
              <div className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <NavLink href={item.href} key={item.href} label={item.label} onClick={() => setMenuOpen(false)} />
                ))}
                <div className="mt-3 grid gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-xs text-[var(--text-secondary)]">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.6)]" />
                    <Bot className="h-3.5 w-3.5 text-[var(--accent-gold)]" />
                    <span>{statusLabel}</span>
                  </div>
                  <Button onClick={() => setSubmitOpen(true)} size="sm">
                    <Send className="h-4 w-4" />
                    Submit Task
                  </Button>
                  <Button onClick={connect} size="sm" variant="secondary">
                    <Wallet className="h-4 w-4" />
                    {address ? truncateMiddle(address) : isConnecting ? 'Connecting...' : 'Connect Wallet'}
                  </Button>
                  <button
                    className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-secondary)]"
                    onClick={toggleTheme}
                    type="button"
                  >
                    Theme
                    {theme === 'dark' ? <Moon className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
                  </button>
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
        description="Create an intelligence task and route it through the Argentus backend."
        onOpenChange={setSubmitOpen}
        open={submitOpen}
        title="Submit Intelligence Task"
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            createTaskMutation.mutate(description)
          }}
        >
          <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
            Description
            <textarea
              className="min-h-32 rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[var(--text-primary)] outline-none ring-0 transition placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-gold-dim)]"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="analyze BTC whale accumulation this week"
              required
              value={description}
            />
          </label>

          {createTaskMutation.isError ? (
            <p className="text-sm text-red-300" role="alert">
              {createTaskMutation.error.message}
            </p>
          ) : null}

          {walletError ? <p className="text-xs text-[var(--text-secondary)]">{walletError}</p> : null}

          <div className="flex justify-end">
            <Button disabled={!description.trim() || createTaskMutation.isPending} type="submit">
              {createTaskMutation.isPending ? 'Submitting...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
