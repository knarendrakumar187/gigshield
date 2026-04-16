import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

export default function AdminLoginPage() {
  const { login, refreshProfile } = useAuth()
  const nav = useNavigate()
  const [username, setU] = useState('')
  const [password, setP] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      const role = await login(username, password)
      await refreshProfile()
      if (role !== 'ADMIN') {
        setErr('Admin only. Please sign in with admin credentials.')
        return
      }
      nav('/admin', { replace: true })
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const data = e.response?.data
        if (typeof data === 'string') {
          setErr(data.replace(/<[^>]+>/g, ' ').trim().slice(0, 200) || 'Request failed')
        } else if (data && typeof data === 'object' && 'detail' in (data as any) && typeof (data as any).detail === 'string') {
          setErr((data as any).detail)
        } else {
          setErr(e.response?.statusText || 'Request failed')
        }
      } else {
        // eslint-disable-next-line no-console
        setErr('Something went wrong')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="worker-layout min-h-screen flex flex-col justify-center py-12">
      <Card className="max-w-md mx-auto w-full">
        <h1 className="text-h2 font-display text-[var(--color-text-primary)] mb-2">GigShield Admin</h1>
        <p className="text-body-sm text-[var(--color-text-secondary)] mb-4">Admin login</p>

        {/* ── Admin Demo Fill ─────────────────────────────────────── */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🔐</span>
            <p className="text-xs font-semibold text-white">Demo Admin Account</p>
          </div>
          <button
            type="button"
            onClick={() => { setU('admin'); setP('admin123') }}
            className="text-[11px] font-bold text-purple-400 bg-purple-900/30 hover:bg-purple-800/50 border border-purple-600/40 px-3 py-1.5 rounded-full transition-all whitespace-nowrap"
          >
            ⚡ Demo Fill
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <input
            className="w-full rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-4 py-3 text-[var(--color-text-primary)]"
            placeholder="Username"
            value={username}
            onChange={(e) => setU(e.target.value)}
            required
            autoComplete="off"
          />
          <input
            type="password"
            className="w-full rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-4 py-3 text-[var(--color-text-primary)]"
            placeholder="Password"
            value={password}
            onChange={(e) => setP(e.target.value)}
            required
            autoComplete="off"
          />
          {err ? <p className="text-sm text-red-400">{err}</p> : null}
          <Button type="submit" className="w-full" loading={loading}>
            Sign in
          </Button>
        </form>

        <p className="text-body-sm text-[var(--color-text-muted)] mt-4">
          Worker login: go to <a className="text-[var(--color-accent)]" href="/login">/login</a>
        </p>
      </Card>
    </div>
  )
}

