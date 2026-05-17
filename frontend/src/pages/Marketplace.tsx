import * as Tabs from '@radix-ui/react-tabs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { CheckCircle2, ExternalLink, FileUp, LoaderCircle, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { BASESCAN_BASE, IPFS_GATEWAY } from '@/config'
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
import {
  DEMO_LEADERBOARD,
  DEMO_MARKETPLACE_STATS,
  getDemoMarketplaceRequests,
} from '@/lib/demo-data'
import {
  createMarketplaceRequest,
  fetchLeaderboard,
  fetchMarketplaceRequest,
  fetchMarketplaceRequests,
  fetchMarketplaceStats,
  submitMarketplaceCID,
} from '@/lib/api'
import { cn, formatNumber, formatUsd, toTitleCase, truncateMiddle } from '@/lib/utils'

type RequestStatus = 'open' | 'reviewing' | 'completed'

const statusTabs: RequestStatus[] = ['open', 'reviewing', 'completed']
const categoryOptions = ['crypto_research', 'defi_analysis', 'onchain_analysis', 'market_sentiment', 'whale_tracking', 'custom']

export default function MarketplacePage() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<RequestStatus>('open')
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [newRequestOpen, setNewRequestOpen] = useState(false)
  const [watchingCid, setWatchingCid] = useState<string | null>(null)
  const [submitForm, setSubmitForm] = useState({ cid: '', submitter_address: '', description: '' })
  const [requestForm, setRequestForm] = useState({
    title: '',
    description: '',
    category: 'crypto_research',
    reward_usdc: '1.0',
    deadline: '',
    requester_address: '',
  })

  const statsQuery = useQuery({
    queryKey: ['marketplace-stats'],
    queryFn: fetchMarketplaceStats,
    refetchInterval: 30_000,
  })

  const requestsQuery = useQuery({
    queryKey: ['marketplace-requests', status],
    queryFn: () => fetchMarketplaceRequests(status),
    refetchInterval: 30_000,
  })

  const selectedRequestQuery = useQuery({
    queryKey: ['marketplace-request', selectedRequestId],
    queryFn: () => fetchMarketplaceRequest(selectedRequestId!),
    enabled: Boolean(selectedRequestId),
    refetchInterval: watchingCid ? 5_000 : 30_000,
  })

  useEffect(() => {
    if (!watchingCid || !selectedRequestQuery.data) {
      return
    }

    const submission = selectedRequestQuery.data.submissions.find((item) => item.cid === watchingCid)
    if (submission && submission.status !== 'pending') {
      setWatchingCid(null)
    }
  }, [selectedRequestQuery.data, watchingCid])

  const leaderboardQuery = useQuery({
    queryKey: ['marketplace-leaderboard'],
    queryFn: fetchLeaderboard,
    refetchInterval: 30_000,
  })

  const submitMutation = useMutation({
    mutationFn: () =>
      submitMarketplaceCID({
        request_id: selectedRequestId!,
        cid: submitForm.cid,
        submitter_address: submitForm.submitter_address || undefined,
        description: submitForm.description || undefined,
      }),
    onSuccess: (submission) => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-requests'] })
      queryClient.invalidateQueries({ queryKey: ['marketplace-request', selectedRequestId] })
      setWatchingCid(submission.cid)
      setSubmitForm({ cid: '', submitter_address: '', description: '' })
    },
  })

  const createRequestMutation = useMutation({
    mutationFn: () =>
      createMarketplaceRequest({
        title: requestForm.title,
        description: requestForm.description,
        category: requestForm.category,
        reward_usdc: Number(requestForm.reward_usdc),
        requester_address: requestForm.requester_address || undefined,
        deadline: requestForm.deadline ? new Date(requestForm.deadline).toISOString() : undefined,
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
        deadline: '',
        requester_address: '',
      })
    },
  })

  const selectedRequest = selectedRequestQuery.data?.request
  const submissions = selectedRequestQuery.data?.submissions ?? []
  const statsData = statsQuery.data ?? (statsQuery.isError ? DEMO_MARKETPLACE_STATS : undefined)
  const requestsData = requestsQuery.data ?? (requestsQuery.isError ? getDemoMarketplaceRequests(status) : undefined)
  const leaderboardData = leaderboardQuery.data ?? (leaderboardQuery.isError ? DEMO_LEADERBOARD : undefined)
  const usingFallback = statsQuery.isError || requestsQuery.isError || leaderboardQuery.isError

  useEffect(() => {
    const firstId = requestsData?.[0]?.id ?? null
    setSelectedRequestId((current) => (current && requestsData?.some((request) => request.id === current) ? current : firstId))
  }, [requestsData])

  const successNote = useMemo(() => {
    if (!watchingCid) {
      return null
    }

    return 'Verifier agent reviewing... polling every 5 seconds until the submission resolves.'
  }, [watchingCid])

  return (
    <div className="space-y-10 md:space-y-12">
      {usingFallback ? <FallbackNotice message="Live marketplace endpoints are unavailable. Showing demo request and submission data." /> : null}
      <SectionHeader
        action={
          <Button onClick={() => setNewRequestOpen(true)}>
            <Plus className="h-4 w-4" />
            Post Intelligence Request
          </Button>
        }
        description="Open requests are escrow-backed, reviewable, and accessible to any contributor with a CID-ready report."
        eyebrow="Marketplace"
        title="Request, review, and reward intelligence"
      />

      {!statsData && statsQuery.isLoading ? (
        <LoadingPanel label="Loading marketplace stats..." />
      ) : statsData ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ['Open Requests', formatNumber(statsData.open_requests)],
            ['Total Submissions', formatNumber(statsData.total_submissions)],
            ['Approved', formatNumber(statsData.approved_submissions)],
            ['USDC Distributed', formatUsd(statsData.total_rewarded_usdc)],
          ].map(([label, value]) => (
            <Card className="p-5" key={label}>
              <p className="text-sm text-[var(--text-secondary)]">{label}</p>
              <p className="mt-3 font-display text-4xl text-[var(--text-primary)]">{value}</p>
            </Card>
          ))}
        </div>
      ) : statsQuery.isError ? (
        <ErrorState message={statsQuery.error.message} />
      ) : null}

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

        <Tabs.Content className="grid gap-6 xl:grid-cols-[minmax(18rem,0.92fr)_minmax(0,1.08fr)]" value="requests">
          <div className="min-w-0 space-y-4">
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
                      <StatusBadge status={request.status} />
                      <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        {toTitleCase(request.category)}
                      </span>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{request.title}</h3>
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[var(--text-secondary)]">
                      <span>{formatUsd(request.reward_usdc)} USDC</span>
                      <span>{request.submission_count} submissions</span>
                      <span>{formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                body="No open requests. Be the first to post an intelligence request."
                title="Marketplace is waiting for the first request"
              />
            )}

            <Card>
              <p className="font-display text-2xl text-[var(--text-primary)]">How to upload your data to Filecoin</p>
              <div className="mt-5 space-y-5 text-sm leading-7 text-[var(--text-secondary)]">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Option 1: filecoin-pin CLI</p>
                  <pre className="mt-2 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[#09090b] px-4 py-3 font-mono text-xs text-emerald-200">
{`npm install -g filecoin-pin
PRIVATE_KEY=0x... filecoin-pin add ./your-data.json`}
                  </pre>
                </div>
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Option 2: Pinata</p>
                  <p>Upload at pinata.cloud, then copy the CID from your pin list.</p>
                </div>
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Option 3: web3.storage</p>
                  <p>Upload your dataset, then paste the resulting `bafybei...` CID into the submit form.</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="min-w-0 space-y-4">
            {!selectedRequestId ? (
              <EmptyState
                body="Choose a request from the left to inspect submissions and send a new CID."
                title="Select a request"
              />
            ) : selectedRequestQuery.isError ? (
              <ErrorState message={selectedRequestQuery.error.message} />
            ) : selectedRequestQuery.isLoading ? (
              <LoadingPanel label="Loading request detail..." />
            ) : selectedRequest ? (
              <>
                <Card>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--accent-gold)]">
                        Request detail
                      </p>
                      <h2 className="mt-3 font-display text-3xl text-[var(--text-primary)]">{selectedRequest.title}</h2>
                    </div>
                    <StatusBadge status={selectedRequest.status} />
                  </div>

                  <p className="mt-5 text-sm leading-8 text-[var(--text-secondary)]">{selectedRequest.description}</p>

                  <div className="mt-6 grid gap-4 text-sm text-[var(--text-secondary)] md:grid-cols-2">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em]">Category</p>
                      <p className="mt-2 text-[var(--text-primary)]">{toTitleCase(selectedRequest.category)}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em]">Reward</p>
                      <p className="mt-2 text-[var(--text-primary)]">{formatUsd(selectedRequest.reward_usdc)}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em]">Deadline</p>
                      <p className="mt-2 text-[var(--text-primary)]">
                        {selectedRequest.deadline ? new Date(selectedRequest.deadline).toLocaleString() : 'Open'}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em]">Escrow UID</p>
                      {selectedRequest.escrow_uid ? (
                        <a
                          className="mt-2 inline-flex items-center gap-1 font-mono text-xs text-amber-300 hover:text-amber-200"
                          href={`${BASESCAN_BASE}/${selectedRequest.escrow_uid}`}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {truncateMiddle(selectedRequest.escrow_uid)}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <p className="mt-2 text-[var(--text-primary)]">Not yet assigned</p>
                      )}
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-display text-2xl text-[var(--text-primary)]">Submissions</p>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        Pending reviews automatically poll every five seconds after you submit a CID.
                      </p>
                    </div>
                    {successNote ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        {successNote}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-6 space-y-3">
                    {submissions.length ? (
                      submissions.map((submission) => (
                        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] p-4" key={submission.id}>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <CidLink cid={submission.cid} />
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
                          {submission.description ? (
                            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{submission.description}</p>
                          ) : null}
                          {(submission.arbitrate_tx || submission.collect_tx) && (
                            <div className="mt-4 flex flex-wrap gap-3">
                              {submission.arbitrate_tx ? <TxLink hash={submission.arbitrate_tx} label="Arbitrate" /> : null}
                              {submission.collect_tx ? <TxLink hash={submission.collect_tx} label="Collect" /> : null}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <EmptyState body="No submissions yet. Upload to Filecoin and be the first contributor." title="No submissions yet" />
                    )}
                  </div>
                </Card>

                <Card>
                  <div className="flex items-center gap-3">
                    <FileUp className="h-5 w-5 text-[var(--accent-gold)]" />
                    <div>
                      <p className="font-display text-2xl text-[var(--text-primary)]">Submit CID</p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">Auto-verification starts in the background as soon as the submission lands.</p>
                    </div>
                  </div>
                  <form
                    className="mt-6 grid gap-4"
                    onSubmit={(event) => {
                      event.preventDefault()
                      submitMutation.mutate()
                    }}
                  >
                    <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
                      CID
                      <input
                        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent-gold-dim)]"
                        onChange={(event) => setSubmitForm((current) => ({ ...current, cid: event.target.value }))}
                        placeholder="bafybei..."
                        required
                        value={submitForm.cid}
                      />
                    </label>
                    <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
                      Your Address
                      <input
                        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent-gold-dim)]"
                        onChange={(event) =>
                          setSubmitForm((current) => ({ ...current, submitter_address: event.target.value }))
                        }
                        placeholder="0x..."
                        value={submitForm.submitter_address}
                      />
                    </label>
                    <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
                      Description
                      <textarea
                        className="min-h-28 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent-gold-dim)]"
                        onChange={(event) => setSubmitForm((current) => ({ ...current, description: event.target.value }))}
                        placeholder="What does this data contain?"
                        value={submitForm.description}
                      />
                    </label>
                    {submitMutation.isError ? (
                      <p className="text-sm text-red-300" role="alert">
                        {submitMutation.error.message}
                      </p>
                    ) : null}
                    <div className="flex justify-end">
                      <Button disabled={!submitForm.cid.trim() || submitMutation.isPending} type="submit">
                        {submitMutation.isPending ? 'Submitting...' : 'Submit to Marketplace'}
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
                    <tr className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                      <th className="px-6 py-4">Address</th>
                      <th className="px-6 py-4">Total Submissions</th>
                      <th className="px-6 py-4">Approved</th>
                      <th className="px-6 py-4">Success Rate</th>
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
                            <td className="px-6 py-4 font-mono text-[var(--text-primary)]">{truncateMiddle(address)}</td>
                            <td className="px-6 py-4">{total}</td>
                            <td className="px-6 py-4">{approved}</td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-200">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {success}
                              </span>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td className="px-6 py-8 text-sm text-[var(--text-secondary)]" colSpan={4}>
                          No leaderboard entries yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : leaderboardQuery.isError ? (
            <ErrorState message={leaderboardQuery.error.message} />
          ) : null}
        </Tabs.Content>
      </Tabs.Root>

      <Modal
        description="Post an escrow-backed intelligence request to the open marketplace."
        onOpenChange={setNewRequestOpen}
        open={newRequestOpen}
        title="Post New Request"
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
              Reward (USDC)
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
            <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
              Deadline
              <input
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent-gold-dim)]"
                onChange={(event) => setRequestForm((current) => ({ ...current, deadline: event.target.value }))}
                type="date"
                value={requestForm.deadline}
              />
            </label>
            <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
              Your Address
              <input
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent-gold-dim)]"
                onChange={(event) => setRequestForm((current) => ({ ...current, requester_address: event.target.value }))}
                placeholder="0x..."
                value={requestForm.requester_address}
              />
            </label>
          </div>
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
              {createRequestMutation.isPending ? 'Posting...' : 'Create Request'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
