import { useQuery } from '@tanstack/react-query'
import { Download, ExternalLink } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useParams } from 'wouter'
import { API_BASE, BASESCAN, IPFS_GATEWAY } from '@/config'
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

function ProofRow({ label, value, link }: { label: string; value?: string | null; link?: string }) {
  return (
    <div className="grid gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-4 md:grid-cols-[11rem,1fr] md:items-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">{label}</p>
      {value ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-[var(--text-primary)]">{truncateMiddle(value, 14, 8)}</span>
          <CopyButton label={label} value={value} />
          {link ? (
            <a className="text-amber-300 hover:text-amber-200" href={link} rel="noreferrer" target="_blank">
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      ) : (
        <span className="text-sm text-[var(--text-secondary)]">Unavailable</span>
      )}
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
    enabled: Boolean(taskQuery.data?.result_cid?.startsWith('bafy')),
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
      {usingFallback ? <FallbackNotice message="Showing placeholder task detail because live task data is unavailable." /> : null}
      <SectionHeader
        description="Inspect the task status, Filecoin storage, on-chain proof, and report content in one place."
        eyebrow="Task Detail"
        title={`TASK-${truncateMiddle(task.id, 8, 0)}`}
      />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={task.status} />
              <SignalBadge signal={task.signal} />
              <span className="text-xs text-[var(--text-secondary)]">{new Date(task.updated_at).toLocaleString()}</span>
            </div>
            <p className="mt-5 text-lg leading-8 text-[var(--text-primary)]">{task.description}</p>
          </div>
          <div className="min-w-[14rem] flex-1 lg:max-w-sm">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">Confidence</p>
            <ConfidenceBar score={task.confidence} />
          </div>
        </div>
      </Card>

      <Card>
        <p className="font-display text-2xl text-[var(--text-primary)]">Signal</p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <SignalBadge signal={task.signal} />
          <div className="min-w-[14rem] flex-1 lg:max-w-md">
            <ConfidenceBar score={report?.confidence_score ?? task.confidence} />
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-display text-2xl text-[var(--text-primary)]">Filecoin Storage</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">CID-backed report storage with public retrieval through IPFS gateways.</p>
          </div>
          {task.result_cid ? <CopyButton label="CID" value={task.result_cid} /> : null}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {task.result_cid?.startsWith('bafy') ? (
            <>
              <CidLink cid={task.result_cid} />
              <a
                className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm text-[var(--text-primary)]"
                href={`${IPFS_GATEWAY}/${task.result_cid}`}
                rel="noreferrer"
                target="_blank"
              >
                View on IPFS
              </a>
              <a
                className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm text-[var(--text-primary)]"
                href={`https://gateway.pinata.cloud/ipfs/${task.result_cid}`}
                rel="noreferrer"
                target="_blank"
              >
                View on Pinata
              </a>
            </>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">No CID has been attached yet.</p>
          )}
        </div>
        {ipfsQuery.isError ? (
          <p className="mt-5 text-sm text-[var(--text-secondary)]">
            Report stored on Filecoin. CID: {task.result_cid} - accessible via any IPFS gateway.
          </p>
        ) : null}
      </Card>

      <Card>
        <p className="font-display text-2xl text-[var(--text-primary)]">On-Chain Proof</p>
        <div className="mt-5 space-y-3">
          <ProofRow label="Escrow UID" link={task.escrow_uid ? `${BASESCAN}/${task.escrow_uid}` : undefined} value={task.escrow_uid} />
          <ProofRow
            label="Fulfillment UID"
            link={task.fulfillment_uid ? `${BASESCAN}/${task.fulfillment_uid}` : undefined}
            value={task.fulfillment_uid}
          />
          <div className="grid gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-4 md:grid-cols-[11rem,1fr] md:items-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">Arbitrate TX</p>
            {task.arbitrate_tx ? <TxLink hash={task.arbitrate_tx} /> : <span className="text-sm text-[var(--text-secondary)]">Unavailable</span>}
          </div>
          <div className="grid gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-4 md:grid-cols-[11rem,1fr] md:items-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">Collect TX</p>
            {task.collect_tx ? <TxLink hash={task.collect_tx} /> : <span className="text-sm text-[var(--text-secondary)]">Unavailable</span>}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-2xl text-[var(--text-primary)]">Report</p>
            {report?.smart_money_signal ? <SignalBadge signal={report.smart_money_signal} /> : null}
          </div>

          {ipfsQuery.isLoading ? (
            <div className="mt-5">
              <LoadingPanel label="Fetching report from IPFS..." />
            </div>
          ) : report ? (
            <div className="mt-6 space-y-6">
              {report.executive_summary ? (
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">Executive Summary</p>
                  <div className="prose-report mt-3 text-sm">
                    <ReactMarkdown>{report.executive_summary}</ReactMarkdown>
                  </div>
                </div>
              ) : null}

              {report.key_findings?.length ? (
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">Key Findings</p>
                  <ul className="mt-3 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
                    {report.key_findings.map((finding) => (
                      <li key={finding}>{finding}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {report.key_tokens?.length ? (
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">Key Tokens</p>
                  <div className="mt-3 overflow-x-auto rounded-3xl border border-[var(--border)]">
                    <table className="min-w-full text-left">
                      <thead className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                        <tr className="text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                          <th className="px-4 py-3">Symbol</th>
                          <th className="px-4 py-3">Signal</th>
                          <th className="px-4 py-3">Risk</th>
                          <th className="px-4 py-3">Thesis</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.key_tokens.map((token) => (
                          <tr className="border-b border-[var(--border)] text-sm text-[var(--text-secondary)]" key={`${token.symbol}-${token.thesis}`}>
                            <td className="px-4 py-4 font-mono text-[var(--text-primary)]">{token.symbol}</td>
                            <td className="px-4 py-4">{toTitleCase(token.sentiment)}</td>
                            <td className="px-4 py-4">{token.risk_level ? toTitleCase(token.risk_level) : 'N/A'}</td>
                            <td className="px-4 py-4">{token.thesis}</td>
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
          ) : task.summary ? (
            <div className="mt-6 space-y-5">
              <p className="text-sm leading-8 text-[var(--text-secondary)]">{task.summary}</p>
              <p className="text-sm text-[var(--text-secondary)]">
                Report on Filecoin. Try: {task.result_cid ? `ipfs.io/ipfs/${task.result_cid}` : 'No CID yet'}
              </p>
            </div>
          ) : (
            <EmptyState body="Report stored on Filecoin. Try: ipfs.io/ipfs/{cid}" title="Report not yet accessible" />
          )}
        </Card>

        <Card>
          <p className="font-display text-2xl text-[var(--text-primary)]">Metadata</p>
          <div className="mt-6 space-y-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">Data Sources</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {report?.data_sources?.length ? (
                  report.data_sources.map((source) => (
                    <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-primary)]" key={source}>
                      {source}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-[var(--text-secondary)]">No sources published yet.</span>
                )}
              </div>
            </div>

            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">Generated At</p>
              <p className="mt-2 text-sm text-[var(--text-primary)]">
                {report?.generated_at ? new Date(report.generated_at).toLocaleString() : new Date(task.updated_at).toLocaleString()}
              </p>
            </div>

            {task.user_chat_id ? (
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">Telegram Chat</p>
                <p className="mt-2 text-sm text-[var(--text-primary)]">{task.user_chat_id.replace(/^telegram:/, '')}</p>
              </div>
            ) : null}

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
