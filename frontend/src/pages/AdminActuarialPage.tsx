import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import client, { formatInr } from '../api/client'
import { Card } from '../components/ui/Card'
import { KPICard } from '../components/ui/KPICard'
import { AdminNavbar } from '../components/AdminNavbar'
import { Button } from '../components/ui/Button'

type ActuarialData = {
  current: {
    week_start: string
    premiums: string
    claims_paid: string
    loss_ratio: number
    combined_ratio: number
    solvency_margin: number
  }
  series: {
    week_start: string
    loss_ratio: number
    premiums: string
  }[]
}

const IconActivity = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
const IconShield = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
const IconTarget = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>

export default function AdminActuarialPage() {
  const [data, setData] = useState<ActuarialData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    client.get('/api/admin/actuarial/')
      .then((r) => setData(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const chartData = data?.series.map(d => ({
    week: d.week_start.slice(5),
    "Loss Ratio %": Math.round(d.loss_ratio * 100),
    "Premiums": parseFloat(d.premiums)
  })) || []

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] p-6 space-y-6 pb-24">
      <AdminNavbar 
        title="Actuarial Overview" 
        subtitle="Financial stability and loss ratio monitoring"
        rightElement={<Button variant="ghost" onClick={load}>Refresh</Button>}
      />

      {loading ? (
        <p className="text-[var(--color-text-muted)]">Loading metrics...</p>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard 
              label="Loss Ratio (Current Week)" 
              value={`${Math.round(data.current.loss_ratio * 100)}%`} 
              icon={IconActivity} 
            />
            <KPICard 
              label="Combined Ratio" 
              value={`${Math.round(data.current.combined_ratio * 100)}%`} 
              icon={IconTarget} 
            />
            <KPICard 
              label="Solvency Margin" 
              value={`${data.current.solvency_margin}x`} 
              icon={IconShield} 
            />
            <KPICard 
              label="Weekly Premiums" 
              value={formatInr(parseFloat(data.current.premiums))} 
              icon={IconActivity} 
            />
          </div>

          <Card>
            <h2 className="text-h3 font-display mb-4">Historical Loss Ratio</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                  <XAxis dataKey="week" stroke="#a0aec0" />
                  <YAxis stroke="#a0aec0" label={{ value: '% Ratio', angle: -90, position: 'insideLeft', fill: '#a0aec0' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a202c', borderColor: '#4a5568', color: '#f7fafc' }}
                    itemStyle={{ color: '#63b3ed' }}
                  />
                  <Line type="monotone" dataKey="Loss Ratio %" stroke="#00d4aa" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-body-sm text-[var(--color-text-muted)] mt-4">
              A loss ratio below 60% indicates strong profitability. Values over 100% mean claims exceeded premiums for the period.
            </p>
          </Card>
        </>
      ) : (
        <p className="text-red-400">Failed to load data.</p>
      )}
    </div>
  )
}
