import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow, isToday } from 'date-fns'
import { Plus, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useLocation } from 'wouter'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CidLink } from '@/components/ui/CidLink'
import { ConfidenceBar } from '@/components/ui/ConfidenceBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { FallbackNotice } from '@/components/ui/FallbackNotice'
import { LoadingPanel } from '@/components/ui/LoadingPanel'
import { Modal } from '@/components/ui/Modal'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SignalBadge } from '@/components/ui/SignalBadge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { getDemoTasks } from '@/lib/demo-data'
import { createTask, fetchTasks } from '@/lib/api'
import { cn, formatNumber, truncateMiddle } from '@/lib/utils'

type TaskFilter = 'active' | 'completed' | 'failed'

const filterLabels: Record<TaskFilter, string> = {
  active: 'Active',
  completed: 'Completed',
  failed: 'Failed',
}

export default function TasksPage() {
  const queryClient = useQueryClient()
  const [, navigate] = useLocation()
  const [filter, setFilter] = useState<TaskFilter>('active')
  const [submitOpen, setSubmitOpen] = useState(false)
  const [description, setDescription] = useState('')

  const activeQuery = useQuery({
    queryKey: ['tasks', 'active'],
    queryFn: () => fetchTasks(),
    refetchInterval: 10_000,
  })

  const completedQuery = useQuery({
    queryKey: ['tasks', 'completed'],
    queryFn: () => fetchTasks('completed'),
  })

  const failedQuery = useQuery({
    queryKey: ['tasks', 'failed'],
    queryFn: () => fetchTasks('failed'),
  })

  const filteredQuery =
    filter === 'active' ? activeQuery : filter === 'completed' ? completedQuery : failedQuery
  const activeData = activeQuery.data ?? (activeQuery.isError ? getDemoTasks('active') : undefined)
  const completedData = completedQuery.data ?? (completedQuery.isError ? getDemoTasks('completed') : undefined)
  const failedData = failedQuery.data ?? (failedQuery.isError ? getDemoTasks('failed') : undefined)
  const filteredData = filter === 'active' ? activeData : filter === 'completed' ? completedData : failedData
  const usingFallback = activeQuery.isError || completedQuery.isError || failedQuery.isError

  const createTaskMutation = useMutation({
    mutationFn: () => createTask(description, undefined),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setDescription('')
      setSubmitOpen(false)
      navigate(`/tasks/${task.id}`)
    },
  })

  const completedToday = completedData?.filter((task) => isToday(new Date(task.updated_at))).length ?? 0
  const averageConfidence =
    (activeData ?? [])
      .map((task) => task.confidence ?? 0)
      .reduce((sum, current) => sum + current, 0) / Math.max((activeData ?? []).length, 1)

  const signalChart = useMemo(() => {
    const counts = { bullish: 0, bearish: 0, neutral: 0 }
    for (const task of activeData ?? []) {
      if (task.signal) {
        counts[task.signal] += 1
      }
    }

    return [
      { signal: 'Bullish', value: counts.bullish },
      { signal: 'Neutral', value: counts.neutral },
      { signal: 'Bearish', value: counts.bearish },
    ]
  }, [activeData])

  return (
    <div className="space-y-10 md:space-y-12">
      {usingFallback ? <FallbackNotice message="Live task APIs are unavailable. Showing demo intelligence tasks until the backend responds." /> : null}
      <SectionHeader
        action={
          <Button onClick={() => setSubmitOpen(true)}>
            <Plus className="h-4 w-4" />
            Submit Intelligence Task
          </Button>
        }
        description="Argentus tasks are the direct execution stream for the internal agent runtime, from request to Filecoin storage and escrow settlement."
        eyebrow="Tasks"
        title="Live intelligence execution"
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-5">
            <p className="text-sm text-[var(--text-secondary)]">Active tasks</p>
            <p className="mt-3 font-display text-4xl text-[var(--text-primary)]">{formatNumber(activeData?.length)}</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-[var(--text-secondary)]">Completed today</p>
            <p className="mt-3 font-display text-4xl text-[var(--text-primary)]">{completedToday}</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-[var(--text-secondary)]">Average confidence</p>
            <p className="mt-3 font-display text-4xl text-[var(--text-primary)]">{(averageConfidence * 100).toFixed(0)}%</p>
          </Card>
        </div>

        <Card className="h-[16rem]">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[var(--accent-gold)]" />
            <p className="text-sm text-[var(--text-secondary)]">Signal distribution on active tasks</p>
          </div>
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={signalChart}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="signal" stroke="var(--text-secondary)" tickLine={false} />
              <YAxis allowDecimals={false} stroke="var(--text-secondary)" tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(17,17,19,0.94)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  color: '#f0f0f4',
                }}
              />
              <Bar dataKey="value" fill="#f59e0b" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(filterLabels) as TaskFilter[]).map((key) => (
          <button
            className={cn(
              'rounded-full border px-4 py-2 text-sm transition',
              filter === key
                ? 'border-[var(--accent-gold-dim)] bg-amber-500/12 text-[var(--text-primary)]'
                : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
            )}
            key={key}
            onClick={() => setFilter(key)}
            type="button"
          >
            {filterLabels[key]}
          </button>
        ))}
      </div>

      {!filteredData && filteredQuery.isLoading ? (
        <LoadingPanel label={`Loading ${filterLabels[filter].toLowerCase()} tasks...`} />
      ) : filteredData?.length ? (
        <div className="grid gap-4">
          {filteredData.map((task) => (
            <button
              className="rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-6 text-left transition hover:border-[var(--accent-gold-dim)] hover:bg-[rgba(245,158,11,0.04)]"
              key={task.id}
              onClick={() => navigate(`/tasks/${task.id}`)}
              type="button"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-[var(--border)] px-3 py-1 font-mono text-xs text-[var(--text-secondary)]">
                    {truncateMiddle(task.id, 8, 4)}
                  </span>
                  <StatusBadge status={task.status} />
                  <SignalBadge signal={task.signal} />
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  {formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}
                </p>
              </div>

              <p className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{task.description}</p>

              <div className="mt-5 grid gap-4 md:grid-cols-[1fr,auto] md:items-center">
                <div>
                  <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    Confidence
                  </p>
                  <ConfidenceBar score={task.confidence} />
                </div>
                <CidLink cid={task.result_cid} />
              </div>
            </button>
          ))}
        </div>
      ) : filteredQuery.isError ? (
        <ErrorState message={filteredQuery.error.message} />
      ) : (
        <EmptyState
          body="No tasks yet. Submit a task via Telegram or the form above."
          title={`No ${filterLabels[filter].toLowerCase()} tasks`}
        />
      )}

      <Modal
        description="Create a new task and route it directly into the Argentus task pipeline."
        onOpenChange={setSubmitOpen}
        open={submitOpen}
        title="Submit Intelligence Task"
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            createTaskMutation.mutate()
          }}
        >
          <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
            Description
            <textarea
              className="min-h-32 rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent-gold-dim)]"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="e.g. analyze BTC whale accumulation this week"
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
              {createTaskMutation.isPending ? 'Submitting...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
