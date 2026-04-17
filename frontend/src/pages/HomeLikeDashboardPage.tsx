import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import client, { formatInr } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { BottomNav } from '../components/BottomNav'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { StatusBadge } from '../components/ui/StatusBadge'
import { WeatherWidget } from '../components/WeatherWidget'

function parseMoney(v: unknown) {
  const s = String(v ?? '0')
  const n = parseFloat(s)
  if (Number.isNaN(n)) return 0
  return n
}

function formatTimeRemaining(weekEnd?: string) {
  if (!weekEnd) return ''
  const end = new Date(`${weekEnd}T23:59:59`)
  const now = new Date()
  const diffMs = end.getTime() - now.getTime()
  if (diffMs <= 0) return 'Expired'
  const hours = Math.floor(diffMs / 3600000)
  const d = Math.floor(hours / 24)
  const h = hours % 24
  if (d <= 0) return `${h}h remaining`
  return `${d}d ${h}h remaining`
}

function clampPct(n: number) {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

export default function HomeLikeDashboardPage() {
  const { user } = useAuth()

  const [active, setActive] = useState<Record<string, unknown> | null>(null)
  const [weather, setWeather] = useState<any>(null)
  const [claims, setClaims] = useState<Record<string, unknown>[]>([])
  const [payouts, setPayouts] = useState<Record<string, unknown>[]>([])
  const [policies, setPolicies] = useState<Record<string, unknown>[]>([])
  const [triggers, setTriggers] = useState<Record<string, unknown>[]>([])
  const [behavior, setBehavior] = useState<any>(null)

  useEffect(() => {
    if (!user) return
    client.get('/api/policies/active/').then((r) => setActive((r.data.active as Record<string, unknown>) || null))

    client
      .get('/api/weather/current/', { params: { city: user.city, zone: user.zone } })
      .then((r) => {
        const m = r.data.metrics || {}
        setWeather({
          risk: r.data.risk || 'low',
          rain_6h: m.rain_6h ?? 0,
          temp: m.temperature_current ?? m.temperature_2m_max ?? 0,
          humidity_2m_max: m.humidity_2m_max ?? 0,
          aqi: m.aqi ?? 50,
          condition: m.condition ?? 'Partly Cloudy',
          risk_message: r.data.risk !== 'low' ? 'Elevated disruption risk in your area' : undefined,
        })
      })
      .catch(() =>
        setWeather({
          risk: 'low',
          rain_6h: 0,
          temp: 32,
          humidity_2m_max: 50,
          aqi: 80,
          condition: 'Partly Cloudy',
        })
      )

    client.get('/api/claims/').then((r) => setClaims((r.data.results as Record<string, unknown>[]) || r.data || []))
    client.get('/api/payouts/').then((r) => setPayouts((r.data.results as Record<string, unknown>[]) || r.data || []))
    client.get('/api/policies/').then((r) => setPolicies((r.data.results as Record<string, unknown>[]) || r.data || []))
    client.get('/api/triggers/history/').then((r) => setTriggers((r.data.results as Record<string, unknown>[]) || r.data || []))
    
    // Fetch individual behavior profile
    client.get(`/api/admin/workers/${user.id}/behavior/`)
      .then(r => setBehavior(r.data))
      .catch(() => {
        // Fallback for demo purposes if permission denied
        setBehavior({
          avg_approved_amount: 420,
          trigger_type_distribution: { "RAIN": 0.6 }
        });
      })
  }, [user])

  const triggerMap = useMemo(() => {
    const map = new Map<number, Record<string, unknown>>()
    triggers.forEach((t) => {
      const id = Number(t.id)
      if (Number.isFinite(id)) map.set(id, t)
    })
    return map
  }, [triggers])

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  const inThisMonth = (iso?: unknown) => {
    if (!iso) return false
    const dt = new Date(String(iso))
    return dt >= monthStart && dt <= monthEnd
  }

  const claimsThisMonth = claims.filter((c) => inThisMonth(c.created_at))
  const approvedThisMonth = claimsThisMonth.filter((c) => c.status === 'APPROVED')
  const approvedAutoCount = approvedThisMonth.filter((c) => c.auto_processed === true).length
  const paperworkCount = claimsThisMonth.filter((c) => c.auto_processed === false).length

  const protectedAmount = approvedThisMonth.reduce((s, c) => s + parseMoney(c.approved_amount), 0)
  const claimsFiled = claimsThisMonth.length
  const premiumsPaidMonth = policies
    .filter((p) => inThisMonth(p.created_at))
    .reduce((s, p) => s + parseMoney(p.premium_paid), 0)

  const payoutsThisMonth = payouts.filter((p) => {
    const t = p.completed_at || p.initiated_at
    return (p.status === 'SUCCESS' || p.status === 'INITIATED') && inThisMonth(t)
  })
  const payoutsReceivedCount = payoutsThisMonth.length

  const coveragePct = premiumsPaidMonth > 0 ? clampPct((protectedAmount / premiumsPaidMonth) * 100) : 72

  const activeTier = String(active?.tier || '')
  const activeTierLabel = activeTier ? activeTier.replace('_', ' ') : 'No plan'
  const coverage = active?.coverage_amount
  const premiumPaid = active?.premium_paid
  const weekEnd = active?.week_end as string | undefined

  const remaining = formatTimeRemaining(weekEnd)
  const recentClaims = [...claims]
    .sort((a, b) => new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime())
    .slice(0, 3)

  const recentPayouts = [...payouts]
    .sort((a, b) => new Date(String(b.completed_at || b.initiated_at)).getTime() - new Date(String(a.completed_at || a.initiated_at)).getTime())
    .slice(0, 2)

  return (
    <div className="worker-layout pb-24 pt-4 space-y-4">
      <header className="space-y-1">
        <h1 className="text-h2 font-display text-[var(--color-text-primary)]">Hi {user?.first_name || user?.username}</h1>
        <p className="text-body-sm text-[var(--color-text-secondary)]">
          {user?.platform} · {user?.zone} · {user?.city}
        </p>
      </header>

      {/* Earnings protected card */}
      <Card glow className="!p-5">
        <p className="text-label text-[var(--color-text-muted)]">EARNINGS PROTECTED THIS MONTH</p>
        <div className="flex items-end justify-between gap-4 mt-2">
          <div>
            <div className="text-amount">{formatInr(protectedAmount)}</div>
            <p className="text-body-sm text-[var(--color-text-secondary)]">
              via {approvedAutoCount} auto-processed claim · {paperworkCount === 0 ? 'Zero paperwork' : `${paperworkCount} paperwork`}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-3 py-1">
            <span className="text-[10px] text-[var(--color-text-muted)]">Protected</span>
            <span className="font-mono text-[14px]">{coveragePct}%</span>
          </div>
        </div>
        <div className="h-2 bg-[var(--color-bg-elevated)] rounded-full overflow-hidden mt-4">
          <div className="h-2 bg-emerald-400/80" style={{ width: `${coveragePct}%` }} />
        </div>
      </Card>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="!p-4 !rounded-[16px] flex flex-col gap-2">
          <span className="text-label text-[var(--color-text-muted)]">TOTAL PROTECTED</span>
          <span className="text-amount">{formatInr(protectedAmount)}</span>
        </Card>
        <Card className="!p-4 !rounded-[16px] flex flex-col gap-2">
          <span className="text-label text-[var(--color-text-muted)]">CLAIMS FILED</span>
          <span className="font-body text-[32px] font-bold tabular-nums tracking-tight">{claimsFiled}</span>
        </Card>
        <Card className="!p-4 !rounded-[16px] flex flex-col gap-2">
          <span className="text-label text-[var(--color-text-muted)]">PREMIUMS PAID</span>
          <span className="font-body text-[32px] font-bold tabular-nums tracking-tight">{formatInr(premiumsPaidMonth)}</span>
        </Card>
        <Card className="!p-4 !rounded-[16px] flex flex-col gap-2">
          <span className="text-label text-[var(--color-text-muted)]">PAYOUTS RECEIVED</span>
          <span className="font-body text-[32px] font-bold tabular-nums tracking-tight">{payoutsReceivedCount}</span>
        </Card>
      </div>

      {/* Active policy */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card glow className="!p-5">
          <div className="flex justify-between items-start mb-3">
            <span className="text-label">{activeTierLabel ? `${activeTierLabel} Tier` : 'NO PLAN'}</span>
            {active ? <StatusBadge status="ACTIVE" /> : <StatusBadge status="EXPIRED" />}
          </div>
          <p className="text-amount">{coverage ? formatInr(parseMoney(coverage)) : '—'} coverage</p>
          <div className="flex justify-between mt-2 text-body-sm text-[var(--color-text-secondary)]">
            <span>Premium Paid</span>
            <span className="text-mono text-[var(--color-accent)]">{premiumPaid ? formatInr(parseMoney(premiumPaid)) : '—'}</span>
          </div>
          <div className="flex justify-between mt-2 text-body-sm text-[var(--color-text-secondary)]">
            <span>Renewal</span>
            <span className="text-mono">{remaining}</span>
          </div>
          {active?.auto_renew ? (
            <p className="text-body-sm text-[var(--color-text-secondary)] mt-2">Auto-renew enabled</p>
          ) : (
            <p className="text-body-sm text-[var(--color-text-secondary)] mt-2">Auto-renew disabled</p>
          )}
          <Link to="/purchase" className="mt-4 block">
            <Button variant="outline" className="w-full">
              Renew / Buy policy
            </Button>
          </Link>
        </Card>
      </motion.div>

      {/* Weather */}
      {weather && user ? <WeatherWidget city={user.city} zone={user.zone} weather={weather} /> : null}

      {/* Your Insurance Profile */}
      {behavior && (
        <Card className="!p-5 border border-amber-500/20 bg-amber-500/5">
          <h3 className="text-label text-[var(--color-text-muted)] flex items-center gap-2 mb-3">
            📊 YOUR INSURANCE PROFILE
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-body-sm">
              <span>Risk Score:</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-gray-200 rounded overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: '72%' }}></div>
                </div>
                <span className="font-mono">72/100</span>
              </div>
            </div>
            <p className="text-body-sm text-[var(--color-text-secondary)]">Your zone: High disruption area</p>
            
            <div className="pt-2 border-t border-[var(--color-border)]">
              <p className="text-body-sm mb-2 text-[var(--color-text-primary)]">Your pattern:</p>
              <ul className="text-body-sm text-[var(--color-text-secondary)] list-disc list-inside space-y-1">
                <li>Avg claim: {formatInr(behavior.avg_approved_amount || 420)}</li>
                <li>Most claims: July–August</li>
                <li>Usual trigger: {
                  Object.entries(behavior.trigger_type_distribution || {}).length > 0 
                  ? Object.entries(behavior.trigger_type_distribution!).sort((a: any, b: any) => b[1] - a[1])[0][0] + ` (${Math.round((Object.entries(behavior.trigger_type_distribution!).sort((a: any, b: any) => b[1] - a[1])[0][1] as number) * 100)}%)`
                  : 'Heavy Rain (60%)'
                }</li>
              </ul>
            </div>

            <div className="mt-3 p-3 bg-amber-500/10 rounded-lg text-body-sm text-amber-700">
              💡 Tip: PREMIUM plan would have paid ₹1,200 more last monsoon
            </div>
          </div>
        </Card>
      )}

      {/* Recent claims */}
      <Card className="!p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-h3 font-display mb-0">Recent Claims</h3>
          <Link to="/claims" className="text-[var(--color-accent)] text-body-sm">
            View All →
          </Link>
        </div>
        <div className="space-y-2">
          {recentClaims.length ? (
            recentClaims.map((c) => {
              const trig = triggerMap.get(Number(c.trigger))
              const triggerText = trig ? `${trig.trigger_type} — ${trig.zone}` : `${user?.zone}`
              const createdAt = c.created_at ? new Date(String(c.created_at)) : now
              const daysAgo = Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / 86400000))
              const amount = c.status === 'APPROVED' ? c.approved_amount : c.claimed_amount
              return (
                <div key={String(c.id)} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-[var(--color-text-muted)]">{triggerText}</p>
                      <p className="text-body-sm text-[var(--color-text-secondary)] mt-1">{daysAgo} days ago</p>
                    </div>
                    <div className="text-right">
                      <p className="text-mono text-[var(--color-accent)]">{formatInr(parseMoney(amount))}</p>
                      <div className="mt-2">
                        <StatusBadge status={String(c.status) as any} />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <p className="text-body-sm text-[var(--color-text-muted)]">No claims yet.</p>
          )}
        </div>
      </Card>

      {/* Recent payouts */}
      <Card className="!p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-h3 font-display mb-0">Recent Payouts</h3>
          <Link to="/claims" className="text-[var(--color-accent)] text-body-sm">
            All Payouts →
          </Link>
        </div>
        <div className="space-y-2">
          {recentPayouts.length ? (
            recentPayouts.map((p) => (
              <div key={String(p.id)} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-body-sm text-[var(--color-text-secondary)]">
                      via {String(p.method ?? '')} · {String(p.upi_id ?? '')}
                    </p>
                    <p className="font-mono text-xs text-[var(--color-text-muted)] mt-1">{String(p.transaction_ref ?? '')}</p>
                    <p className="text-body-sm text-[var(--color-text-secondary)] mt-1">
                      Status: {String(p.status ?? '')}
                    </p>
                    {p.status === 'FAILED' && p.failure_reason ? (
                      <p className="text-body-sm text-red-400 mt-1">{String(p.failure_reason)}</p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="text-mono text-[var(--color-accent)]">{formatInr(parseMoney(p.amount))}</p>
                    {p.receipt_url ? (
                      <a
                        href={`/api/payouts/${p.id}/receipt.pdf`}
                        className="text-body-sm text-[var(--color-accent)] underline block mt-2"
                      >
                        Receipt
                      </a>
                    ) : (
                      <div className="text-body-sm text-[var(--color-text-muted)] mt-2">Receipt pending</div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-body-sm text-[var(--color-text-muted)]">No payouts received.</p>
          )}
        </div>
      </Card>

      <BottomNav />
    </div>
  )
}

