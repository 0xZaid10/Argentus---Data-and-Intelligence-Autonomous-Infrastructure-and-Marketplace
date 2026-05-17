import { useQuery } from '@tanstack/react-query'
import { Download, ExternalLink } from 'lucide-react'
import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import { useParams } from 'wouter'
import { API_BASE, BASESCAN_BASE, IPFS_GATEWAY } from '@/config'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CidLink } from '@/components/ui/CidLink'
import { ConfidenceBar } from '@/components/ui/ConfidenceBar'
import { CopyButton } from '@/components/ui/CopyButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { FallbackNotice } from '@/components/ui/FallbackNotice'
import { LoadingPanel } from '@/components/ui/LoadingPanel'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SignalBadge } from '@/components/ui/SignalBadge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { TxLink } from '@/components/ui/TxLink'
import { isDemoTaskId } from '@/lib/demo-data'
import { fetchIpfsReport, fetchTask } from '@/lib/api'
import { isPendingStatus, toTitleCase, truncateMiddle } from '@/lib/utils'

interface ReportToken {
  symbol: string
  thesis: string
  sentiment: string
  risk_level?: string
}

interface ReportPayload {
  executive_summary?: string
  key_findings?: string[]
  key_tokens?: ReportToken[]
  risks?: string[]
  smart_money_signal?: 'bullish' | 'bearish' | 'neutral'
  confidence_score?: number
  data_sources?: string[]
  generated_at?: string
  market_narrative?: string
}

function resolveReportDownload(task: Record<string, unknown>) {
  const candidates = ['report_pdf_path', 'pdf_path', 'report_path']

  for (const key of candidates) {
    const value = task[key]
    if (typeof value === 'string' && value.length > 0) {
      return value.startsWith('http') ? value : `${API_BASE}${value.startsWith('/') ? '' : '/'}${value}`
    }
  }

  return null
}

function ProofRow({ label, value, children }: { label: string; value?: string | null; children?: ReactNode }) {
  return (
    <div className="grid gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-4 md:grid-cols-[10rem,1fr] md:items-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">{label}</p>
      <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-primary)]">
        {children ?? (value ? <span className="font-mono">{truncateMiddle(value, 14, 8)}</span> : <span>Unavailable</span>)}
      </div>
    </div>
  )
}

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>()
  const taskQuery = useQuery({
    queryKey: ['task', params.id],
    queryFn: () => fetchTask(params.id),
    refetchInterval: (query) => (isPendingStatus(query.state.data?.status) ? 5_000 : false),
  })

  const ipfsQuery = useQuery({
    queryKey: ['task-report', taskQuery.data?.result_cid],
    queryFn: () => fetchIpfsReport<ReportPayload>(taskQuery.data!.result_cid!, IPFS_GATEWAY),
    enabled: Boolean(taskQuery.data?.result_cid),
  })

  if (taskQuery.isError) {
    return <ErrorState message={taskQuery.error.message} />
  }

  if (taskQuery.isLoading || !taskQuery.data) {
    return <LoadingPanel label="Loading task detail..." />
  }

  const task = taskQuery.data
  const pdfUrl = resolveReportDownload(task as unknown as Record<string, unknown>)
  const report = ipfsQuery.data
  const usingFallback = isDemoTaskId(task.id)

  return (
    <div className="space-y-10 md:space-y-12">
      {usingFallback ? (
        <FallbackNotice message="Showing a demo task because the live backend is unavailable or this task was opened from placeholder content." />
      ) : null}
      <SectionHeader
        description="Inspect escrow, fulfillment, CID storage, arbitration, and the structured intelligence payload for a single task."
        eyebrow="Task Detail"
        title={task.description}
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-[var(--border)] px-3 py-1 font-mono text-xs text-[var(--text-secondary)]">
                {truncateMiddle(task.id, 10, 6)}
              </span>
              <StatusBadge status={task.status} />
              <SignalBadge signal={task.signal} />
            </div>
            <div className="mt-5 grid gap-2 text-sm text-[var(--text-secondary)] md:grid-cols-2">
              <p>Created: {new Date(task.created_at).toLocaleString()}</p>
              <p>Updated: {new Date(task.updated_at).toLocaleString()}</p>
            </div>
          </div>
          <div className="w-full max-w-sm">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">Confidence</p>
            <ConfidenceBar score={task.confidence} />
          </div>
        </div>
      </Card>

      <Card>
        <p className="font-display text-2xl text-[var(--text-primary)]">On-chain proof</p>
        <div className="mt-5 space-y-3">
          <ProofRow label="Escrow UID" value={task.escrow_uid}>
            {task.escrow_uid ? (
              <>
                <span className="font-mono">{truncateMiddle(task.escrow_uid, 14, 8)}</span>
                <CopyButton label="Escrow UID" value={task.escrow_uid} />
                <a className="text-amber-300 hover:text-amber-200" href={`${BASESCAN_BASE}/${task.escrow_uid}`} rel="noreferrer" target="_blank">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </>
            ) : null}
          </ProofRow>
          <ProofRow label="Fulfillment UID" value={task.fulfillment_uid}>
            {task.fulfillment_uid ? (
              <>
                <span className="font-mono">{truncateMiddle(task.fulfillment_uid, 14, 8)}</span>
                <CopyButton label="Fulfillment UID" value={task.fulfillment_uid} />
                <a className="text-amber-300 hover:text-amber-200" href={`${BASESCAN_BASE}/${task.fulfillment_uid}`} rel="noreferrer" target="_blank">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </>
            ) : null}
          </ProofRow>
          <ProofRow label="Arbitrate TX">{task.arbitrate_tx ? <TxLink hash={task.arbitrate_tx} /> : null}</ProofRow>
          <ProofRow label="Collect TX">{task.collect_tx ? <TxLink hash={task.collect_tx} /> : null}</ProofRow>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-display text-2xl text-[var(--text-primary)]">IPFS storage</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">The CID is the durable handle for the stored report on Filecoin-backed IPFS infrastructure.</p>
          </div>
          {task.result_cid ? <CopyButton label="CID" value={task.result_cid} /> : null}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {task.result_cid ? (
            <>
              <CidLink cid={task.result_cid} />
              <a
                className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm text-[var(--text-primary)]"
                href={`https://gateway.pinata.cloud/ipfs/${task.result_cid}`}
                rel="noreferrer"
                target="_blank"
              >
                View on Pinata
              </a>
              <a
                className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm text-[var(--text-primary)]"
                href={`${IPFS_GATEWAY}/${task.result_cid}`}
                rel="noreferrer"
                target="_blank"
              >
                Download JSON
              </a>
            </>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">No CID has been attached yet.</p>
          )}
        </div>
        {ipfsQuery.isError ? (
          <div className="mt-5">
            <ErrorState message={ipfsQuery.error.message} />
          </div>
        ) : null}
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-2xl text-[var(--text-primary)]">Research report</p>
            {report?.smart_money_signal ? <SignalBadge signal={report.smart_money_signal} /> : null}
          </div>

          {ipfsQuery.isLoading ? (
            <div className="mt-5">
              <LoadingPanel label="Fetching CID content..." />
            </div>
          ) : report ? (
            <div className="mt-6 space-y-6">
              {report.executive_summary ? (
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">Executive summary</p>
                  <div className="prose-report mt-3 text-sm">
                    <ReactMarkdown>{report.executive_summary}</ReactMarkdown>
                  </div>
                </div>
              ) : null}

              {report.market_narrative ? (
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">Market narrative</p>
                  <p className="mt-3 text-sm leading-8 text-[var(--text-secondary)]">{report.market_narrative}</p>
                </div>
              ) : null}

              {report.key_findings?.length ? (
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">Key findings</p>
                  <ul className="mt-3 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
                    {report.key_findings.map((finding) => (
                      <li key={finding}>{finding}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {report.key_tokens?.length ? (
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">Key tokens</p>
                  <div className="mt-3 overflow-x-auto rounded-3xl border border-[var(--border)]">
                    <table className="min-w-full text-left">
                      <thead className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                        <tr className="text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                          <th className="px-4 py-3">Symbol</th>
                          <th className="px-4 py-3">Thesis</th>
                          <th className="px-4 py-3">Sentiment</th>
                          <th className="px-4 py-3">Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.key_tokens.map((token) => (
                          <tr className="border-b border-[var(--border)] text-sm text-[var(--text-secondary)]" key={`${token.symbol}-${token.thesis}`}>
                            <td className="px-4 py-4 font-mono text-[var(--text-primary)]">{token.symbol}</td>
                            <td className="px-4 py-4">{token.thesis}</td>
                            <td className="px-4 py-4">{toTitleCase(token.sentiment)}</td>
                            <td className="px-4 py-4">{token.risk_level ? toTitleCase(token.risk_level) : 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {report.risks?.length ? (
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">Risks</p>
                  <ul className="mt-3 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
                    {report.risks.map((risk) => (
                      <li key={risk}>{risk}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyState body="CID content will render here once the report is available through the public gateway." title="Report pending" />
          )}
        </Card>

        <Card>
          <p className="font-display text-2xl text-[var(--text-primary)]">Report metadata</p>
          <div className="mt-6 space-y-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">Signal + confidence</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <SignalBadge signal={report?.smart_money_signal ?? task.signal} />
                <div className="min-w-[12rem] flex-1">
                  <ConfidenceBar score={report?.confidence_score ?? task.confidence} />
                </div>
              </div>
            </div>

            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">Data sources</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {report?.data_sources?.length ? (
                  report.data_sources.map((source) => (
                    <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-primary)]" key={source}>
                      {source}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-[var(--text-secondary)]">No data sources published yet.</span>
                )}
              </div>
            </div>

            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">Generated at</p>
              <p className="mt-2 text-sm text-[var(--text-primary)]">
                {report?.generated_at ? new Date(report.generated_at).toLocaleString() : 'Awaiting CID payload'}
              </p>
            </div>

            {pdfUrl ? (
              <a href={pdfUrl} rel="noreferrer" target="_blank">
                <Button className="w-full">
                  <Download className="h-4 w-4" />
                  Download Full Report PDF
                </Button>
              </a>
            ) : (
              <Button className="w-full" disabled variant="secondary">
                <Download className="h-4 w-4" />
                PDF not available yet
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
