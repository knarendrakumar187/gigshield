import { useEffect, useState } from 'react'
import axios from 'axios'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import client, { formatInr } from '../api/client'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { KPICard } from '../components/ui/KPICard'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AdminNavbar } from '../components/AdminNavbar'
type Dash = {
  premiums_collected: string
  claims_paid: string
  loss_ratio: number
  solvency_margin_latest: number | null
  reserve_held: number
  max_exposure: string
  actuarial_recent: { week_start: string; loss_ratio: number }[]
  active_workers_with_policy: number
  active_policies: number
  fraud_flagged: number
  triggers_fired_7d: number
  awaiting_review: number
  claims_queue: {
    id: number | null
    status: string
    worker: { id: number; name: string; city: string; zone: string; platform: string }
    trigger: { type: string | null; city: string; zone: string; severity?: number | null; duration_hours?: number | null }
    fraud_score: number
    fraud_flags: string[]
    claimed_amount: string
    created_at: string | null
  }[]
  active_workers_details: {
    worker_id: number
    name: string
    city: string
    zone: string
    platform: string
    tier: string
    week_start: string
    week_end: string
    coverage_amount: string
    premium_paid: string
  }[]
  risk_leaderboard: { worker_id: number; name: string; city: string; platform: string; claims: number; score: number }[]
  recent_triggers: {
    id: number
    trigger_type: string
    city: string
    zone: string
    severity: number
    triggered_at: string
    affected_workers_count: number
    total_payout_triggered: string
  }[]
  weekly_premium_vs_payouts: { week_start: string; premiums: string; payouts: string }[]
  claim_outcomes: { APPROVED: number; REJECTED: number }
  fraud_heatmap_by_zone: { zone: string; claims: number; flagged: number; heat_score: number; category: string }[]
  actuarial_health: {
    loss_ratio: number
    expense_ratio: number | null
    profit_margin: number | null
    combined_ratio: number
    over_target: boolean | null
  }
}

const IconBanknotes = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent, #00d4aa)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="12" x="2" y="6" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" /></svg>;
const IconCreditCard = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent, #00d4aa)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>;
const IconActivity = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent, #00d4aa)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>;
const IconShield = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent, #00d4aa)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
const IconUsers = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent, #00d4aa)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
const IconFileText = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent, #00d4aa)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" /></svg>;
const IconFlag = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent, #00d4aa)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" x2="4" y1="22" y2="15" /></svg>;
const IconZap = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent, #00d4aa)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
const IconTarget = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent, #00d4aa)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>;
const IconTrendingDown = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent, #00d4aa)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" /></svg>;
const IconTrendingUp = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent, #00d4aa)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>;
const IconPieChart = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent, #00d4aa)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></svg>;
const IconDatabase = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent, #00d4aa)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>;
const IconAlertTriangle = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent, #00d4aa)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;

export default function AdminDashboardPage() {
  const { logout } = useAuth()
  const nav = useNavigate()
  const [dash, setDash] = useState<Dash | null>(null)
  const [err, setErr] = useState('')

  const load = () => {
    client
      .get('/api/admin/dashboard/')
      .then((r) => {
        setDash(r.data)
        setErr('')
      })
      .catch((e) => {
        if (axios.isAxiosError(e)) {
          const st = e.response?.status
          if (st === 403) setErr('Admin only — sign in as admin / admin123.')
          else if (!e.response) setErr('Could not reach the server.')
          else {
            const d = e.response.data as { detail?: string }
            setErr(typeof d?.detail === 'string' ? d.detail : `Request failed (${st ?? 'error'}).`)
          }
        } else setErr('Request failed.')
      })
  }

  useEffect(() => {
    load()
  }, [])



  async function reviewClaim(id: number, action: 'approve' | 'reject') {
    await client.patch(`/api/admin/claims/${id}/review/`, { action })
    load()
  }

  const weeklyChartData =
    dash?.weekly_premium_vs_payouts?.map((x) => ({
      week: x.week_start.slice(5),
      premiums: Number(x.premiums || 0),
      payouts: Number(x.payouts || 0),
    })) ?? []

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] p-6 space-y-6 pb-24">
      <AdminNavbar 
        title="Admin Dashboard" 
        subtitle="Platform overview · DEVTrails 2026"
        rightElement={<Button variant="ghost" onClick={load}>Refresh</Button>}
      />
      {err ? <p className="text-amber-400 text-sm">{err}</p> : null}
      {dash ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Premiums (week)" value={formatInr(parseFloat(dash.premiums_collected))} icon={IconBanknotes} />
          <KPICard label="Claims paid" value={formatInr(parseFloat(dash.claims_paid))} icon={IconCreditCard} />
          <KPICard
            label="Loss ratio"
            value={`${Math.round(dash.loss_ratio * 1000) / 10}%`}
            delta={dash.loss_ratio * 100 - 62.5}
            icon={IconActivity}
          />
          <KPICard label="Solvency ×" value={dash.solvency_margin_latest ?? '—'} icon={IconShield} />
          <KPICard label="Active workers" value={dash.active_workers_with_policy ?? '—'} icon={IconUsers} />
          <KPICard label="Active policies" value={dash.active_policies ?? '—'} icon={IconFileText} />
          <KPICard label="Fraud flagged" value={dash.fraud_flagged ?? '—'} icon={IconFlag} />
          <KPICard label="Triggers (7d)" value={dash.triggers_fired_7d ?? '—'} icon={IconZap} />
        </div>
      ) : null}



      <Card>
        <h2 className="text-h3 font-display mb-4">Weekly Premiums vs Payouts</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyChartData}>
              <CartesianGrid stroke="#1e2d40" />
              <XAxis dataKey="week" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e2d40' }} />
              <Area type="monotone" dataKey="premiums" name="Premiums" stroke="#22c55e" fill="rgba(34,197,94,0.15)" />
              <Area type="monotone" dataKey="payouts" name="Payouts" stroke="#f97316" fill="rgba(249,115,22,0.15)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-h3 font-display mb-4">Claim Outcomes</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ status: 'APPROVED', value: dash?.claim_outcomes?.APPROVED ?? 0 }, { status: 'REJECTED', value: dash?.claim_outcomes?.REJECTED ?? 0 }]}>
                <CartesianGrid stroke="#1e2d40" />
                <XAxis dataKey="status" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e2d40' }} />
                <Bar dataKey="value" fill="#4ade80" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h2 className="text-h3 font-display mb-4">Fraud Heatmap by Zone</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
            {dash?.fraud_heatmap_by_zone?.length ? (
              dash.fraud_heatmap_by_zone.map((r) => {
                const badge =
                  r.category === 'SAFE'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : r.category === 'WATCH'
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : r.category === 'ALERT'
                        ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                        : 'bg-red-500/15 text-red-400 border border-red-500/30'
                return (
                  <div key={r.zone} className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-3">
                    <div className="min-w-0">
                      <p className="font-display font-semibold truncate">{r.zone}</p>
                      <p className="text-body-sm text-[var(--color-text-secondary)]">
                        {r.claims} claims · {r.flagged} flagged
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge}`}>{r.heat_score}</span>
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-body-sm text-[var(--color-text-muted)]">No heatmap data.</p>
            )}
          </div>
        </Card>
      </div>

      {dash?.actuarial_health ? (
        <Card>
          <div className="flex border-b border-[var(--color-border)] pb-2 mb-4">
            <div>
              <h2 className="text-h3 font-display">Detailed Actuarial Analysis</h2>
              <p className="text-body-sm text-[var(--color-text-secondary)]">Portfolio health, solvency, and reserving metrics</p>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              label="Over Target"
              value={dash.actuarial_health.over_target ? 'Yes' : 'No'}
              delta={0}
              icon={IconTarget}
            />
            <KPICard
              label="Loss Ratio"
              value={`${Math.round(dash.actuarial_health.loss_ratio * 1000) / 10}%`}
              delta={dash.loss_ratio * 100 - 62.5}
              icon={IconTrendingDown}
            />
            <KPICard
              label="Expense Ratio"
              value={dash.actuarial_health.expense_ratio == null ? '—' : `${Math.round(dash.actuarial_health.expense_ratio * 1000) / 10}%`}
              icon={IconTrendingDown}
            />
            <KPICard
              label="Combined Ratio"
              value={`${Math.round((dash.actuarial_health.combined_ratio || 0) * 1000) / 10}%`}
              icon={IconPieChart}
            />
            <KPICard
              label="Profit Margin"
              value={
                dash.actuarial_health.profit_margin == null ? '—' : `${Math.round((dash.actuarial_health.profit_margin || 0) * 1000) / 10}%`
              }
              icon={IconTrendingUp}
            />
            <KPICard
              label="Reserve Held"
              value={dash.reserve_held != null ? formatInr(dash.reserve_held) : '—'}
              icon={IconDatabase}
            />
            <KPICard
              label="Max Exposure"
              value={dash.max_exposure ? formatInr(parseFloat(dash.max_exposure)) : '—'}
              icon={IconAlertTriangle}
            />
          </div>
        </Card>
      ) : null}

    </div>
  )
}
