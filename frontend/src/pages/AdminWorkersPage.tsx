import { useEffect, useMemo, useState } from 'react'
import client from '../api/client'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AdminNavbar } from '../components/AdminNavbar'

type Worker = {
  id: number
  username: string
  email: string
  phone: string
  city: string
  zone: string
  platform: string
  first_name?: string
  last_name?: string
  worker_profile?: {
    kyc_verified?: boolean
    is_verified?: boolean
    risk_score?: number
    risk_tier?: string
  }
}

const tierStyles: Record<string, { wrap: string; text: string }> = {
  LOW: { wrap: 'bg-emerald-500/15 border border-emerald-500/30', text: 'text-emerald-400' },
  MEDIUM: { wrap: 'bg-amber-500/15 border border-amber-500/30', text: 'text-amber-400' },
  HIGH: { wrap: 'bg-red-500/15 border border-red-500/30', text: 'text-red-400' },
}

function initialsOf(s: string) {
  const t = (s || '').trim()
  if (!t) return '?'
  return t[0].toUpperCase()
}

function BehaviorStats({ workerId }: { workerId: number }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    client.get(`/api/admin/workers/${workerId}/behavior/`)
      .then(r => setData(r.data))
      .catch(() => setData({ _missing: true }))
  }, [workerId]);

  if (!data) return <p className="text-xs text-[var(--color-text-muted)] mt-3">Loading behavior...</p>;
  if (data._missing) return <p className="text-xs text-[var(--color-text-muted)] mt-3">No behavioral profile.</p>;
  
  return (
    <div className="flex flex-wrap gap-4 mt-3 text-xs text-[var(--color-text-secondary)] border-t border-[var(--color-border)] pt-3">
       <div><span className="text-[var(--color-text-muted)]">Avg Claim/Wk:</span> {data.avg_claims_per_week_3m ?? 0}</div>
       <div><span className="text-[var(--color-text-muted)]">Amount Volatility:</span> {data.amount_volatility ?? 0}</div>
       <div><span className="text-[var(--color-text-muted)]">Prior Flags:</span> {data.has_prior_fraud_flag ? '1' : '0'}</div>
       <div><span className="text-[var(--color-text-muted)]">Confidence:</span> {Math.round((data.profile_confidence ?? 0)*100)}%</div>
    </div>
  )
}

export default function AdminWorkersPage() {
  const { logout } = useAuth()
  const nav = useNavigate()
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [city, setCity] = useState('ALL')
  const [platform, setPlatform] = useState('ALL')

  useEffect(() => {
    setLoading(true)
    client
      .get('/api/admin/workers/')
      .then((r) => setWorkers(Array.isArray(r.data) ? (r.data as Worker[]) : []))
      .finally(() => setLoading(false))
  }, [])

  const cities = useMemo(() => {
    const s = new Set<string>()
    workers.forEach((w) => {
      if (w.city) s.add(w.city)
    })
    return ['ALL', ...Array.from(s).sort()]
  }, [workers])

  const platforms = useMemo(() => {
    const s = new Set<string>()
    workers.forEach((w) => {
      if (w.platform) s.add(w.platform)
    })
    return ['ALL', ...Array.from(s).sort()]
  }, [workers])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return workers.filter((w) => {
      const matchesSearch =
        !q ||
        `${w.first_name || ''} ${w.last_name || ''} ${w.username || ''} ${w.zone || ''} ${w.city || ''}`.toLowerCase().includes(q)
      const matchesCity = city === 'ALL' || w.city === city
      const matchesPlatform = platform === 'ALL' || w.platform === platform
      return matchesSearch && matchesCity && matchesPlatform
    })
  }, [workers, search, city, platform])

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] p-6 space-y-6 pb-24">
      <AdminNavbar 
        title="Active Workers" 
        subtitle={`${filtered.length} listed`}
        rightElement={<Button variant="ghost" onClick={() => window.location.reload()}>Refresh</Button>}
      />

      <div className="grid md:grid-cols-3 gap-3">
        <Card className="p-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or zone..."
            className="w-full rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-4 py-3"
          />
        </Card>
        <Card className="p-4">
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-4 py-3"
          >
            {cities.map((c) => (
              <option key={c} value={c}>
                {c === 'ALL' ? 'All Cities' : c}
              </option>
            ))}
          </select>
        </Card>
        <Card className="p-4">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="w-full rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-4 py-3"
          >
            {platforms.map((p) => (
              <option key={p} value={p}>
                {p === 'ALL' ? 'All Platforms' : p}
              </option>
            ))}
          </select>
        </Card>
      </div>

      {loading ? (
        <p className="text-body-sm text-[var(--color-text-muted)]">Loading...</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((w) => {
            const name = `${w.first_name || ''} ${w.last_name || ''}`.trim() || w.username
            const tier = w.worker_profile?.risk_tier || 'MEDIUM'
            const styles = tierStyles[String(tier).toUpperCase()] ?? tierStyles.MEDIUM
            const riskScore = w.worker_profile?.risk_score ?? 0
            const kyc = w.worker_profile?.kyc_verified || w.worker_profile?.is_verified || false
            return (
              <Card key={w.id} className="!p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] flex items-center justify-center font-display text-lg">
                      {initialsOf(name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-display font-semibold truncate">{name}</p>
                      <p className="text-body-sm text-[var(--color-text-secondary)] truncate">
                        {w.phone} {w.email ? `· ${w.email}` : ''}
                      </p>
                      <p className="text-body-sm text-[var(--color-text-muted)] mt-1">
                        {w.city} {w.zone ? `• ${w.zone}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${styles.wrap} ${styles.text}`}>
                      {String(tier).toUpperCase()} • {Math.round(riskScore)}
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${kyc ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-gray-500/15 text-gray-300 border border-gray-500/30'}`}>
                      {kyc ? 'KYC ✓' : 'KYC —'}
                    </span>
                  </div>
                </div>
                <BehaviorStats workerId={w.id} />
              </Card>
            )
          })}
          {!filtered.length ? <p className="text-body-sm text-[var(--color-text-muted)]">No workers found.</p> : null}
        </div>
      )}

    </div>
  )
}

