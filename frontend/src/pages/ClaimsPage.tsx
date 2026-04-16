import { useEffect, useState } from 'react'
import client, { formatInr } from '../api/client'
import { BottomNav } from '../components/BottomNav'
import { FraudScoreMeter } from '../components/FraudScoreMeter'
import { ClaimTimeline } from '../components/PayoutTimeline'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Card } from '../components/ui/Card'

type ClaimRow = {
  id: number
  status: string
  fraud_score: number
  approved_amount: string
  payout_ref?: string
  payout?: { completed_at?: string | null } | null
  worker?: { upi_id?: string } | null
}

export default function ClaimsPage() {
  const [rows, setRows] = useState<ClaimRow[]>([])

  useEffect(() => {
    const loadClaims = () =>
      client.get('/api/claims/').then((r) => {
        const d = r.data.results ?? r.data
        setRows(Array.isArray(d) ? d : [])
      })

    void loadClaims()
    const timer = window.setInterval(() => {
      void loadClaims()
    }, 10000)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  const approved = rows.filter((c) => c.status === 'APPROVED').length
  const rejected = rows.filter((c) => c.status === 'REJECTED').length

  return (
    <div className="worker-layout pb-24 pt-4 space-y-4">
      <h1 className="text-h2 font-display">Claims</h1>
      <p className="text-body-sm text-[var(--color-text-secondary)]">
        {rows.length} total · {approved} approved · {rejected} rejected
      </p>
      {rows.map((c) => (
        <Card key={c.id} className="space-y-3">
          <div className="flex justify-between items-start gap-3">
            <div>
              <p className="font-mono text-xs text-[var(--color-text-muted)]">#{c.id}</p>
              <StatusBadge status={c.status as 'APPROVED' | 'REJECTED' | 'PENDING' | 'MANUAL_REVIEW'} />
            </div>
            <FraudScoreMeter score={Math.round(c.fraud_score || 0)} />
          </div>
          <p className="text-mono text-[var(--color-accent)]">{formatInr(parseFloat(c.approved_amount || '0'))}</p>
          {c.payout_ref ? (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-mono text-xs text-gray-400">Ref: {c.payout_ref}</span>
              {c.payout_ref.startsWith('pout_') && (
                <span className="bg-blue-900/30 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/30">
                  ⚡ PAID VIA RAZORPAY TEST ROUTE
                </span>
              )}
            </div>
          ) : null}

          <div className="mt-1">
            <ClaimTimeline
              claim={{
                status: c.status as any,
                approved_amount: c.approved_amount,
                payout: c.payout ?? null,
                worker: c.worker ?? undefined,
              }}
            />
          </div>
        </Card>
      ))}
      <BottomNav />
    </div>
  )
}
