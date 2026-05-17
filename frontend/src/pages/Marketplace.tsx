import * as Tabs from '@radix-ui/react-tabs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { AlertTriangle, CheckCircle2, LoaderCircle, Plus, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { BASESCAN } from '@/config'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CidLink } from '@/components/ui/CidLink'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { FallbackNotice } from '@/components/ui/FallbackNotice'
import { LoadingPanel } from '@/components/ui/LoadingPanel'
import { Modal } from '@/components/ui/Modal'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { TxLink } from '@/components/ui/TxLink'
import { DEMO_LEADERBOARD, DEMO_MARKETPLACE_STATS, getDemoMarketplaceRequests } from '@/lib/demo-data'
import {
  createRequest,
  fetchLeaderboard,
  fetchMarketplaceStats,
  type MarketplaceSubmission,
  fetchRequest,
  fetchRequests,
  submitToMarketplace,
} from '@/lib/api'
import { cn, formatNumber, formatUsd, toTitleCase, truncateMiddle } from '@/lib/utils'

type RequestStatus = 'open' | 'reviewing' | 'completed'
type SubmissionResult = 'pending' | 'approved' | 'rejected' | null

const statusTabs: RequestStatus[] = ['open', 'reviewing', 'completed']
const categoryOptions = ['crypto_research', 'defi_analysis', 'onchain_analysis', 'market_sentiment', 'whale_tracking', 'custom']

function resolveSubmissionScore(submission: MarketplaceSubmission | null) {
  if (!submission || typeof submission.quality_score !== 'number') {
    return submission?.status === 'approved' ? 82 : null
  }

  return submission.quality_score <= 1 ? Math.round(submission.quality_score * 100) : Math.round(submission.quality_score)
}

function resolveSubmissionReason(submission: MarketplaceSubmission | null) {
  if (!submission) {
    return null
  }

  return (
    submission.reason ||
    submission.description ||
    (submission.status === 'approved'
      ? 'Content directly addresses the request and passed automated verification.'
      : 'Content was too short, off-topic, or missing real supporting data.')
  )
}

export default function MarketplacePage() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<RequestStatus>('open')
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [newRequestOpen, setNewRequestOpen] = useState(false)
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult>(null)
  const [resolvedSubmission, setResolvedSubmission] = useState<MarketplaceSubmission | null>(null)
  const [submissionTimedOut, setSubmissionTimedOut] = useState(false)
  const [submittedAt, setSubmittedAt] = useState<number | null>(null)
  const [submitForm, setSubmitForm] = useState({
    raw_content: '',
    cid: '',
    submitter_address: '',
    description: '',
  })
  const [requestForm, setRequestForm] = useState({
    title: '',
    description: '',
    category: 'crypto_research',
    reward_usdc: '1.0',
    requester_address: '',
  })

  const statsQuery = useQuery({
    queryKey: ['marketplace-stats'],
    queryFn: fetchMarketplaceStats,
    refetchInterval: 30_000,
  })

  const requestsQuery = useQuery({
    queryKey: ['marketplace-requests', status],
    queryFn: () => fetchRequests(status),
    refetchInterval: submissionResult === 'pending' ? 3_000 : 10_000,
  })

  const selectedRequestQuery = useQuery({
    queryKey: ['marketplace-request', selectedRequestId],
    queryFn: () => fetchRequest(selectedRequestId!),
    enabled: Boolean(selectedRequestId),
    refetchInterval: submissionResult === 'pending' ? 3_000 : 30_000,
  })

  const leaderboardQuery = useQuery({
    queryKey: ['marketplace-leaderboard'],
    queryFn: fetchLeaderboard,
    refetchInterval: 30_000,
  })

  useEffect(() => {
    if (!submissionId || !selectedRequestQuery.data) {
      return
    }

    const submission = selectedRequestQuery.data.submissions.find((item) => item.id === submissionId)
    if (!submission) {
      return
    }

    if (submission.status === 'approved' || submission.status === 'rejected') {
      setSubmissionResult(submission.status)
      setResolvedSubmission(submission)
      setSubmissionTimedOut(false)
      queryClient.invalidateQueries({ queryKey: ['marketplace-requests'] })
      queryClient.invalidateQueries({ queryKey: ['marketplace-stats'] })
    }
  }, [queryClient, selectedRequestQuery.data, submissionId])

  useEffect(() => {
    if (submissionResult !== 'pending' || !submittedAt) {
      return
    }

    const timeout = window.setTimeout(() => {
      setSubmissionTimedOut(true)
    }, 5 * 60 * 1000)

    return () => window.clearTimeout(timeout)
  }, [submissionResult, submittedAt])

  const submitMutation = useMutation({
    mutationFn: () =>
      submitToMarketplace({
        request_id: selectedRequestId!,
        cid: submitForm.cid.trim() || undefined,
        raw_content: submitForm.raw_content.trim() || undefined,
        submitter_address: submitForm.submitter_address.trim() || undefined,
        description: submitForm.description.trim() || undefined,
      }),
    onSuccess: (submission) => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-requests'] })
      queryClient.invalidateQueries({ queryKey: ['marketplace-request', selectedRequestId] })
      setSubmissionId(submission.id)
      setSubmissionResult('pending')
      setResolvedSubmission(submission)
      setSubmissionTimedOut(false)
      setSubmittedAt(Date.now())
      setSubmitForm({ raw_content: '', cid: '', submitter_address: '', description: '' })
    },
  })

  const createRequestMutation = useMutation({
    mutationFn: () =>
      createRequest({
        title: requestForm.title,
        description: requestForm.description,
        category: requestForm.category,
        reward_usdc: Number(requestForm.reward_usdc),
        requester_address: requestForm.requester_address || undefined,
      }),
    onSuccess: (request) => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-requests'] })
      queryClient.invalidateQueries({ queryKey: ['marketplace-stats'] })
      setNewRequestOpen(false)
      setStatus('open')
      setSelectedRequestId(request.id)
      setRequestForm({
        title: '',
        description: '',
        category: 'crypto_research',
        reward_usdc: '1.0',
        requester_address: '',
      })
    },
  })

  const statsData = statsQuery.data ?? (statsQuery.isError ? DEMO_MARKETPLACE_STATS : undefined)
  const requestsData = requestsQuery.data ?? (requestsQuery.isError ? getDemoMarketplaceRequests(status) : undefined)
  const leaderboardData = leaderboardQuery.data ?? (leaderboardQuery.isError ? DEMO_LEADERBOARD : undefined)
  const selectedRequest = selectedRequestQuery.data?.request
  const submissions = selectedRequestQuery.data?.submissions ?? []
  const usingFallback = statsQuery.isError || requestsQuery.isError || leaderboardQuery.isError
  const canSubmit = Boolean(selectedRequestId && (submitForm.raw_content.trim() || submitForm.cid.trim()))
  const resolvedScore = resolveSubmissionScore(resolvedSubmission)
  const resolvedReason = resolveSubmissionReason(resolvedSubmission)

  useEffect(() => {
    const firstId = requestsData?.[0]?.id ?? null
    setSelectedRequestId((current) => (current && requestsData?.some((request) => request.id === current) ? current : firstId))
  }, [requestsData])

  const pollingNote = useMemo(() => {
    if (submissionResult !== 'pending' || submissionTimedOut) {
      return null
    }

    return 'Verifier agent reviewing...'
  }, [submissionResult, submissionTimedOut])

  const resetSubmissionFeedback = () => {
    setSubmissionId(null)
    setSubmissionResult(null)
    setResolvedSubmission(null)
    setSubmissionTimedOut(false)
    setSubmittedAt(null)
  }

  return (
    <div className="space-y-10 md:space-y-12">
      {usingFallback ? <FallbackNotice message="Marketplace backend is offline. Showing placeholder requests and submissions." /> : null}
      <SectionHeader
        action={
          <Button onClick={() => setNewRequestOpen(true)}>
            <Plus className="h-4 w-4" />
            Post Request
          </Button>
        }
        description="Request intelligence, receive submissions, and release payment only after verification."
        eyebrow="Marketplace"
        title="Open intelligence market"
      />

      {!statsData && statsQuery.isLoading ? (
        <LoadingPanel label="Loading marketplace stats..." />
      ) : statsData ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ['Open', formatNumber(statsData.open_requests)],
            ['Submissions', formatNumber(statsData.total_submissions)],
            ['Approved', formatNumber(statsData.approved_submissions)],
            ['Paid', `${formatUsd(statsData.total_rewarded_usdc)} USDC`],
          ].map(([label, value]) => (
            <Card className="p-5" key={label}>
              <p className="text-sm text-[var(--text-secondary)]">{label}</p>
              <p className="mt-3 font-display text-4xl text-[var(--text-primary)]">{value}</p>
            </Card>
          ))}
        </div>
      ) : (
        <ErrorState message="Service offline. VPS: 104.207.76.143" />
      )}

      <Tabs.Root className="space-y-6" defaultValue="requests">
        <Tabs.List className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface-2)] p-1">
          {[
            ['requests', 'Requests'],
            ['leaderboard', 'Leaderboard'],
          ].map(([value, label]) => (
            <Tabs.Trigger
              className="rounded-full px-4 py-2 text-sm text-[var(--text-secondary)] data-[state=active]:bg-[var(--surface-3)] data-[state=active]:text-[var(--text-primary)]"
              key={value}
              value={value}
            >
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content className="grid gap-6 xl:grid-cols-[minmax(19rem,0.88fr)_minmax(0,1.12fr)]" value="requests">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {statusTabs.map((tab) => (
                <button
                  className={cn(
                    'rounded-full border px-4 py-2 text-sm transition',
                    status === tab
                      ? 'border-[var(--accent-gold-dim)] bg-amber-500/12 text-[var(--text-primary)]'
                      : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                  )}
                  key={tab}
                  onClick={() => setStatus(tab)}
                  type="button"
                >
                  {toTitleCase(tab)}
                </button>
              ))}
            </div>

            {!requestsData && requestsQuery.isLoading ? (
              <LoadingPanel label="Loading marketplace requests..." />
            ) : requestsData?.length ? (
              <div className="space-y-3">
                {requestsData.map((request) => (
                  <button
                    className={cn(
                      'w-full rounded-3xl border p-5 text-left transition',
                      selectedRequestId === request.id
                        ? 'border-[var(--accent-gold-dim)] bg-[rgba(245,158,11,0.08)]'
                        : 'border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--border-strong)]',
                    )}
                    key={request.id}
                    onClick={() => setSelectedRequestId(request.id)}
                    type="button"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        {toTitleCase(request.category)}
                      </span>
                      <span className="font-mono text-sm text-[var(--accent-gold)]">{formatUsd(request.reward_usdc)} USDC</span>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{request.title}</h3>
                    <p className="mt-3 text-sm text-[var(--text-secondary)]">
                      {request.submission_count} submissions • {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <StatusBadge status={request.status} />
                      {request.status === 'completed' && 'cid' in request && typeof (request as Record<string, unknown>).cid === 'string' ? (
                        <CidLink cid={(request as Record<string, string>).cid} />
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState body="No open requests. Post the first one." title="No open requests" />
            )}
          </div>

          <div className="space-y-4">
            {!selectedRequestId ? (
              <EmptyState body="Choose a request on the left to inspect details and submit data." title="Select a request" />
            ) : selectedRequestQuery.isError ? (
              <ErrorState message={selectedRequestQuery.error.message} />
            ) : selectedRequestQuery.isLoading ? (
              <LoadingPanel label="Loading request detail..." />
            ) : selectedRequest ? (
              <>
                <Card>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs uppercase tracking-[0.24em] text-[var(--accent-gold)]">Request Detail</p>
                      <h2 className="mt-3 font-display text-3xl text-[var(--text-primary)]">{selectedRequest.title}</h2>
                    </div>
                    <StatusBadge status={selectedRequest.status} />
                  </div>

                  <p className="mt-5 text-sm leading-8 text-[var(--text-secondary)]">{selectedRequest.description}</p>

                  <div className="mt-6 grid gap-4 text-sm text-[var(--text-secondary)] md:grid-cols-3">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em]">Reward</p>
                      <p className="mt-2 text-[var(--text-primary)]">{formatUsd(selectedRequest.reward_usdc)} USDC</p>
                    </div>
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em]">Category</p>
                      <p className="mt-2 text-[var(--text-primary)]">{toTitleCase(selectedRequest.category)}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em]">Escrow</p>
                      {selectedRequest.escrow_uid ? (
                        <a
                          className="mt-2 inline-flex font-mono text-xs text-amber-300 hover:text-amber-200"
                          href={`${BASESCAN}/${selectedRequest.escrow_uid}`}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {truncateMiddle(selectedRequest.escrow_uid)}
                        </a>
                      ) : (
                        <p className="mt-2 text-[var(--text-primary)]">Not assigned</p>
                      )}
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-display text-2xl text-[var(--text-primary)]">Submissions ({submissions.length})</p>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        Submitters can post raw analysis or a Filecoin CID. Approved work settles automatically.
                      </p>
                    </div>
                    {pollingNote ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        {pollingNote}
                      </span>
                    ) : null}
                  </div>

                  {submissionResult === 'pending' && !submissionTimedOut ? (
                    <div className="mt-6 rounded-3xl border border-amber-500/20 bg-amber-500/10 p-5 animate-pulse">
                      <div className="flex items-start gap-3">
                        <LoaderCircle className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-amber-200" />
                        <div>
                          <p className="font-semibold text-amber-100">Verifier agent reviewing...</p>
                          <p className="mt-2 text-sm leading-7 text-amber-100/80">
                            This takes 2-4 minutes (Filecoin upload + on-chain settlement)
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {submissionTimedOut ? (
                    <div className="mt-6 rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-200" />
                        <div className="flex-1">
                          <p className="font-semibold text-yellow-100">Verification is taking longer than expected.</p>
                          <p className="mt-2 text-sm leading-7 text-yellow-100/80">
                            The result will appear here when complete. You can also check back later.
                          </p>
                          <div className="mt-4">
                            <Button onClick={resetSubmissionFeedback} size="sm" variant="secondary">
                              Stop waiting
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {submissionResult === 'approved' && resolvedSubmission ? (
                    <div className="mt-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                        <div className="flex-1">
                          <p className="font-semibold text-emerald-100">Submission Approved!</p>
                          <div className="mt-4 space-y-3 text-sm text-emerald-100/85">
                            {resolvedScore != null ? <p>Quality Score: {resolvedScore}%</p> : null}
                            {resolvedReason ? <p>Reason: {resolvedReason}</p> : null}
                            {resolvedSubmission.cid ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <span>CID:</span>
                                <CidLink cid={resolvedSubmission.cid} />
                              </div>
                            ) : null}
                            {resolvedSubmission.collect_tx ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <span>Collect TX:</span>
                                <TxLink hash={resolvedSubmission.collect_tx} />
                              </div>
                            ) : null}
                            {resolvedSubmission.arbitrate_tx ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <span>Arbitrate TX:</span>
                                <TxLink hash={resolvedSubmission.arbitrate_tx} />
                              </div>
                            ) : null}
                            <p>USDC reward has been sent to your wallet automatically.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {submissionResult === 'rejected' && resolvedSubmission ? (
                    <div className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-5">
                      <div className="flex items-start gap-3">
                        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
                        <div className="flex-1">
                          <p className="font-semibold text-red-100">Submission Rejected</p>
                          <p className="mt-4 text-sm leading-7 text-red-100/85">Reason: {resolvedReason}</p>
                          <div className="mt-4">
                            <Button onClick={resetSubmissionFeedback} size="sm" variant="secondary">
                              Try Again
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-6 space-y-3">
                    {submissions.length ? (
                      submissions.map((submission) => (
                        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] p-4" key={submission.id}>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            {submission.cid ? (
                              <CidLink cid={submission.cid} />
                            ) : (
                              <span className="font-mono text-xs text-[var(--text-secondary)]">Pending upload</span>
                            )}
                            <StatusBadge status={submission.status} />
                          </div>
                          <div className="mt-4 grid gap-3 text-sm text-[var(--text-secondary)] md:grid-cols-2">
                            <div>
                              <p className="font-mono text-[11px] uppercase tracking-[0.18em]">Submitter</p>
                              <p className="mt-2 text-[var(--text-primary)]">
                                {submission.submitter_address ? truncateMiddle(submission.submitter_address) : 'Anonymous'}
                              </p>
                            </div>
                            <div>
                              <p className="font-mono text-[11px] uppercase tracking-[0.18em]">Created</p>
                              <p className="mt-2 text-[var(--text-primary)]">
                                {formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          {submission.reason ? (
                            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{submission.reason}</p>
                          ) : null}
                          {submission.raw_content ? (
                            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[#09090b] px-4 py-3 text-sm leading-7 text-[var(--text-secondary)]">
                              {submission.raw_content}
                            </div>
                          ) : null}
                          {submission.description ? (
                            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{submission.description}</p>
                          ) : null}
                          {(submission.arbitrate_tx || submission.collect_tx) ? (
                            <div className="mt-4 flex flex-wrap gap-3">
                              {submission.arbitrate_tx ? <TxLink hash={submission.arbitrate_tx} label="Arbitrate" /> : null}
                              {submission.collect_tx ? <TxLink hash={submission.collect_tx} label="Collect" /> : null}
                            </div>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <EmptyState body="No submissions yet. Be the first to send data." title="No submissions yet" />
                    )}
                  </div>
                </Card>

                <Card>
                  <p className="font-display text-2xl text-[var(--text-primary)]">Submit Data</p>
                  <form
                    className="mt-6 grid gap-4"
                    onSubmit={(event) => {
                      event.preventDefault()
                      submitMutation.mutate()
                    }}
                  >
                    <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
                      Option A - Paste raw data
                      <textarea
                        className="min-h-32 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent-gold-dim)]"
                        onChange={(event) => setSubmitForm((current) => ({ ...current, raw_content: event.target.value }))}
                        placeholder="Paste your analysis here..."
                        value={submitForm.raw_content}
                      />
                    </label>

                    <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
                      Option B - Already on Filecoin
                      <input
                        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent-gold-dim)]"
                        onChange={(event) => setSubmitForm((current) => ({ ...current, cid: event.target.value }))}
                        placeholder="bafybei..."
                        value={submitForm.cid}
                      />
                    </label>

                    <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
                      Your address (optional)
                      <input
                        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent-gold-dim)]"
                        onChange={(event) => setSubmitForm((current) => ({ ...current, submitter_address: event.target.value }))}
                        placeholder="0x..."
                        value={submitForm.submitter_address}
                      />
                    </label>

                    <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
                      Description
                      <textarea
                        className="min-h-24 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent-gold-dim)]"
                        onChange={(event) => setSubmitForm((current) => ({ ...current, description: event.target.value }))}
                        placeholder="Optional context for the verifier..."
                        value={submitForm.description}
                      />
                    </label>

                    {submitMutation.isError ? (
                      <p className="text-sm text-red-300" role="alert">
                        {submitMutation.error.message}
                      </p>
                    ) : null}

                    <div className="flex justify-end">
                      <Button disabled={!canSubmit || submitMutation.isPending} type="submit">
                        {submitMutation.isPending ? 'Submitting...' : 'Submit'}
                      </Button>
                    </div>
                  </form>
                </Card>
              </>
            ) : null}
          </div>
        </Tabs.Content>

        <Tabs.Content value="leaderboard">
          {!leaderboardData && leaderboardQuery.isLoading ? (
            <LoadingPanel label="Loading leaderboard..." />
          ) : leaderboardData ? (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                    <tr className="text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                      <th className="px-6 py-4">#</th>
                      <th className="px-6 py-4">Address</th>
                      <th className="px-6 py-4">Approved</th>
                      <th className="px-6 py-4">Total</th>
                      <th className="px-6 py-4">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardData.length ? (
                      leaderboardData.map((row, index) => {
                        const address = String(row.address ?? row.submitter_address ?? 'Unknown')
                        const total = Number(row.total_submissions ?? row.total ?? 0)
                        const approved = Number(row.approved ?? row.approved_submissions ?? 0)
                        const success = total > 0 ? `${((approved / total) * 100).toFixed(0)}%` : '0%'

                        return (
                          <tr className="border-b border-[var(--border)] text-sm text-[var(--text-secondary)]" key={`${address}-${index}`}>
                            <td className="px-6 py-4 text-[var(--text-primary)]">{index + 1}</td>
                            <td className="px-6 py-4 font-mono text-[var(--text-primary)]">{truncateMiddle(address)}</td>
                            <td className="px-6 py-4">{approved}</td>
                            <td className="px-6 py-4">{total}</td>
                            <td className="px-6 py-4">{success}</td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td className="px-6 py-8 text-sm text-[var(--text-secondary)]" colSpan={5}>
                          No leaderboard entries yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <ErrorState message="Service offline. VPS: 104.207.76.143" />
          )}
        </Tabs.Content>
      </Tabs.Root>

      <Modal
        description="Create a new intelligence request. Escrow is handled automatically by the backend wallet."
        onOpenChange={setNewRequestOpen}
        open={newRequestOpen}
        title="Post Request"
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            createRequestMutation.mutate()
          }}
        >
          <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
            Title
            <input
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent-gold-dim)]"
              onChange={(event) => setRequestForm((current) => ({ ...current, title: event.target.value }))}
              required
              value={requestForm.title}
            />
          </label>

          <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
            Description
            <textarea
              className="min-h-28 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent-gold-dim)]"
              onChange={(event) => setRequestForm((current) => ({ ...current, description: event.target.value }))}
              required
              value={requestForm.description}
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
              Category
              <select
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent-gold-dim)]"
                onChange={(event) => setRequestForm((current) => ({ ...current, category: event.target.value }))}
                value={requestForm.category}
              >
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {toTitleCase(option)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
              Reward USDC
              <input
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent-gold-dim)]"
                min="0"
                onChange={(event) => setRequestForm((current) => ({ ...current, reward_usdc: event.target.value }))}
                required
                step="0.01"
                type="number"
                value={requestForm.reward_usdc}
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
            Your address (optional)
            <input
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent-gold-dim)]"
              onChange={(event) => setRequestForm((current) => ({ ...current, requester_address: event.target.value }))}
              placeholder="0x..."
              value={requestForm.requester_address}
            />
          </label>

          {createRequestMutation.isError ? (
            <p className="text-sm text-red-300" role="alert">
              {createRequestMutation.error.message}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button
              disabled={!requestForm.title.trim() || !requestForm.description.trim() || createRequestMutation.isPending}
              type="submit"
            >
              {createRequestMutation.isPending ? 'Posting...' : 'Post Request'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
