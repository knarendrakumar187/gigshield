import { useEffect, useState } from 'react'
import client from '../api/client'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { AdminNavbar } from '../components/AdminNavbar'
import { formatInr } from '../api/client'

type Claim = {
  id: number
  worker_id: number
  worker?: {
    id: number
    username: string
    city: string
    zone: string
    platform: string
  }
  fraud_score: number
  fraud_flags?: string[]
  claimed_amount: string
  created_at: string
  trigger?: {
    trigger_type: string
    city: string
    zone: string
    severity: number
    duration_hours: number
  }
}

export default function AdminClaimsReviewPage() {
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    client.get('/api/admin/claims/manual-review/')
      .then((r) => setClaims(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  async function reviewClaim(id: number, action: 'approve' | 'reject') {
    await client.patch(`/api/admin/claims/${id}/review/`, { action })
    load()
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] p-6 space-y-6 pb-24">
      <AdminNavbar 
        title="Manual Review Queue" 
        subtitle={`${claims.length} claims awaiting review`}
        rightElement={<Button variant="ghost" onClick={load}>Refresh</Button>}
      />

      {loading ? (
        <p className="text-[var(--color-text-muted)]">Loading...</p>
      ) : claims.length === 0 ? (
        <Card>
          <p className="text-body text-[var(--color-text-secondary)] text-center py-6">
            All caught up! No claims currently awaiting manual review.
          </p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {claims.map((c) => (
            <Card key={c.id}>
              <div className="flex justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-display font-semibold text-white">
                    {c.worker?.username || `Worker #${c.worker_id}`}
                  </h3>
                  <p className="text-body-sm text-[var(--color-text-secondary)]">
                    {c.worker?.city} • {c.worker?.zone} • {c.worker?.platform}
                  </p>
                  <div className="mt-2 text-body-sm">
                    <span className="text-[var(--color-text-muted)] mt-1">Claim Amount: </span>
                    <span className="font-semibold">{formatInr(parseFloat(c.claimed_amount))}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${c.fraud_score >= 60 ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'}`}>
                    Risk: {c.fraud_score}
                  </span>
                </div>
              </div>

              {c.trigger && (
                <div className="mb-4 text-xs bg-[var(--color-bg-surface)] p-2 rounded border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                  <span className="font-bold block mb-1">Trigger Event</span>
                  {c.trigger.trigger_type} in {c.trigger.city} ({c.trigger.severity}/5 severity), lasted {c.trigger.duration_hours}h.
                </div>
              )}

              {c.fraud_flags && c.fraud_flags.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs text-[var(--color-text-muted)] font-semibold mb-1">Fraud Flags:</div>
                  <ul className="text-xs text-amber-400 space-y-1 list-disc pl-4">
                    {c.fraud_flags.map((flag, idx) => (
                      <li key={idx}>{flag}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2 mt-4 pt-4 border-t border-[var(--color-border)]">
                <Button className="flex-1" variant="primary" onClick={() => reviewClaim(c.id, 'approve')}>
                  Approve Payout
                </Button>
                <Button className="flex-1" variant="danger" onClick={() => reviewClaim(c.id, 'reject')}>
                  Reject Claim
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
