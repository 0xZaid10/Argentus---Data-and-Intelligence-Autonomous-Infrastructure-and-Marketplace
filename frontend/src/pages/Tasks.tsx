import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow, isToday } from 'date-fns'
import { Plus } from 'lucide-react'
import { useState } from 'react'
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
import { formatNumber, truncateMiddle } from '@/lib/utils'

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

  const createTaskMutation = useMutation({
    mutationFn: () => createTask(description),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setDescription('')
      setSubmitOpen(false)
      navigate(`/tasks/${task.id}`)
    },
  })

  const activeData = activeQuery.data ?? (activeQuery.isError ? getDemoTasks('active') : undefined)
  const completedData = completedQuery.data ?? (completedQuery.isError ? getDemoTasks('completed') : undefined)
  const failedData = failedQuery.data ?? (failedQuery.isError ? getDemoTasks('failed') : undefined)
  const filteredData = filter === 'active' ? activeData : filter === 'completed' ? completedData : failedData
  const filteredQuery = filter === 'active' ? activeQuery : filter === 'completed' ? completedQuery : failedQuery
  const usingFallback = activeQuery.isError || completedQuery.isError || failedQuery.isError

  const completedToday = completedData?.filter((task) => isToday(new Date(task.updated_at))).length ?? 0

  return (
    <div className="space-y-10 md:space-y-12">
      {usingFallback ? <FallbackNotice message="Task backend is offline. Showing placeholder task activity." /> : null}
      <SectionHeader
        action={
          <Button onClick={() => setSubmitOpen(true)}>
            <Plus className="h-4 w-4" />
            Submit Task
          </Button>
        }
        description="Active and completed intelligence jobs run through the Argentus agent pipeline."
        eyebrow="Tasks"
        title="Live task stream"
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 gap-4 md:grid-cols-2">
          <Card className="p-5">
            <p className="text-sm text-[var(--text-secondary)]">Active</p>
            <p className="mt-3 font-display text-4xl text-[var(--text-primary)]">{formatNumber(activeData?.length)}</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-[var(--text-secondary)]">Completed today</p>
            <p className="mt-3 font-display text-4xl text-[var(--text-primary)]">{completedToday}</p>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2">
          {(Object.keys(filterLabels) as TaskFilter[]).map((key) => (
            <button
              className={filter === key
                ? 'rounded-full border border-[var(--accent-gold-dim)] bg-amber-500/12 px-4 py-2 text-sm text-[var(--text-primary)]'
                : 'rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]'}
              key={key}
              onClick={() => setFilter(key)}
              type="button"
            >
              {filterLabels[key]}
            </button>
          ))}
        </div>
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
                    TASK-{truncateMiddle(task.id, 8, 0)}
                  </span>
                  <StatusBadge status={task.status} />
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  {formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}
                </p>
              </div>

              <p className="mt-4 max-w-4xl text-lg font-semibold text-[var(--text-primary)]">{task.description}</p>

              <div className="mt-5 grid gap-4 lg:grid-cols-[auto,minmax(12rem,1fr),auto] lg:items-center">
                <SignalBadge signal={task.signal} />
                <ConfidenceBar score={task.confidence} />
                <CidLink cid={task.result_cid} />
              </div>
            </button>
          ))}
        </div>
      ) : filteredQuery.isError ? (
        <ErrorState message={filteredQuery.error.message} />
      ) : (
        <EmptyState body="No tasks yet. Submit one above or via Telegram." title={`No ${filterLabels[filter].toLowerCase()} tasks`} />
      )}

      <Modal
        description="Create a new intelligence task and send it into the research pipeline."
        onOpenChange={setSubmitOpen}
        open={submitOpen}
        title="Submit Task"
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            createTaskMutation.mutate()
          }}
        >
          <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
            What do you want to research?
            <textarea
              className="min-h-32 rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent-gold-dim)]"
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
