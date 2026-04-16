import { useEffect, useState } from 'react'
import client, { formatInr } from '../api/client'
import { Card } from '../components/ui/Card'
import { AdminNavbar } from '../components/AdminNavbar'
import { Button } from '../components/ui/Button'
import { TriggerSimulator } from '../components/TriggerSimulator'

type RecentTrigger = {
  id: number
  trigger_type: string
  city: string
  zone: string
  severity: number
  triggered_at: string
  affected_workers_count: number
  total_payout_triggered: string
}

export default function AdminTriggersPage() {
  const [triggers, setTriggers] = useState<RecentTrigger[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    client.get('/api/admin/dashboard/')
      .then((r) => setTriggers(r.data.recent_triggers))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] p-6 space-y-6 pb-24">
      <AdminNavbar 
        title="Triggers & Simulators" 
        subtitle="Manage weather and disruption triggers"
        rightElement={<Button variant="ghost" onClick={load}>Refresh</Button>}
      />

      <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-180px)] min-h-[500px]">
        <TriggerSimulator onFired={load} />

        <Card className="h-full flex flex-col !p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border)] shrink-0 bg-[var(--color-bg-surface)] z-10">
            <h2 className="text-h3 font-display m-0">Recent Triggers</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {loading ? (
              <p className="text-[var(--color-text-muted)]">Loading...</p>
            ) : triggers?.length > 0 ? (
              <div className="flex flex-col gap-3">
                {triggers.map((t) => (
                  <div key={t.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)] p-4 shadow-sm hover:border-[var(--color-accent)] transition-colors">
                    <div className="flex justify-between">
                      <p className="font-mono text-xs text-[var(--color-text-muted)]">{t.trigger_type}</p>
                      <p className="text-body-sm text-[var(--color-text-secondary)]">Sev: {t.severity}/5</p>
                    </div>
                    <p className="text-body-sm text-white font-semibold mt-1">
                      {t.city} — {t.zone}
                    </p>
                    <div className="flex justify-between items-end mt-2 pt-2 border-t border-[var(--color-border)]">
                      <div>
                        <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Workers Affected</p>
                        <p className="text-sm font-medium">{t.affected_workers_count}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Total Payout</p>
                        <p className="text-sm text-emerald-400 font-bold">{formatInr(parseFloat(t.total_payout_triggered || '0'))}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[var(--color-text-muted)]">No recent triggers.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

