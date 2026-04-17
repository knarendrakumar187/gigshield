import { useEffect, useRef, useState } from 'react'
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
  const [countdown, setCountdown] = useState(10)
  const [pulse, setPulse] = useState(false)
  const countRef = useRef<number>()

  const loadClaims = async () => {
    const r = await client.get('/api/claims/')
    const d = r.data.results ?? r.data
    setRows(Array.isArray(d) ? d : [])
    setPulse(true)
    setTimeout(() => setPulse(false), 600)
  }

  useEffect(() => {
    void loadClaims()
    countRef.current = window.setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          void loadClaims()
          return 10
        }
        return c - 1
      })
    }, 1000)
    return () => window.clearInterval(countRef.current)
  }, [])

  const approved = rows.filter((c) => c.status === 'APPROVED').length
  const rejected = rows.filter((c) => c.status === 'REJECTED').length
  const pending  = rows.filter((c) => c.status === 'PENDING' || c.status === 'MANUAL_REVIEW').length

  return (
    <div className="worker-layout pb-24 pt-4 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2 font-display">Claims</h1>
          <p className="text-body-sm text-[var(--color-text-secondary)] mt-0.5">
            {rows.length} total · {approved} approved · {rejected} rejected
          </p>
        </div>
        {/* Live refresh indicator */}
        <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${pulse ? 'border-emerald-400/80 bg-emerald-900/30 text-emerald-300' : 'border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]'}`}>
          <span className={`w-2 h-2 rounded-full ${pulse ? 'bg-emerald-400 animate-ping' : 'bg-gray-500'}`} />
          {pulse ? 'Updated' : `↻ ${countdown}s`}
        </div>
      </div>

      {/* Stats row */}
      {rows.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Approved', count: approved, color: 'text-emerald-400', bg: 'bg-emerald-900/20 border-emerald-500/30' },
            { label: 'Rejected', count: rejected, color: 'text-red-400',     bg: 'bg-red-900/20 border-red-500/30' },
            { label: 'Pending',  count: pending,  color: 'text-yellow-400',  bg: 'bg-yellow-900/20 border-yellow-500/30' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border px-3 py-2 text-center ${s.bg}`}>
              <p className={`text-lg font-bold ${s.color}`}>{s.count}</p>
              <p className="text-[10px] text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-6 py-12 text-center space-y-2">
          <p className="text-4xl">🌤️</p>
          <p className="text-sm font-semibold text-white">No claims yet</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            Claims are automatically generated when a weather<br />
            disruption occurs in your city. Check back soon!
          </p>
          <p className="text-[10px] text-gray-500 mt-2">Auto-refreshing every 10 seconds…</p>
        </div>
      )}

      {/* Claims List */}
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
