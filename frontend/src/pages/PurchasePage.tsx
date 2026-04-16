import { useEffect, useState } from 'react'
import axios from 'axios'
import confetti from 'canvas-confetti'
import { motion } from 'framer-motion'
import client from '../api/client'
import { BottomNav } from '../components/BottomNav'
import { ExclusionsPanel } from '../components/ExclusionsPanel'
import { PremiumBreakdown } from '../components/PremiumBreakdown'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useAuth } from '../context/AuthContext'

const tierSpring = { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.85 }

const TIERS = [
  { id: 'basic', label: 'Basic', weekly: 25, cover: 300, claims: 2 },
  { id: 'standard', label: 'Standard', weekly: 35, cover: 500, claims: 3, popular: true },
  { id: 'premium', label: 'Premium', weekly: 50, cover: 800, claims: 5 },
]

export default function PurchasePage() {
  const { user, refreshProfile } = useAuth()
  const [step, setStep] = useState(0)
  const [tier, setTier] = useState('standard')
  const [breakdown, setBreakdown] = useState<Record<string, unknown> | null>(null)
  const [exclusions, setExclusions] = useState<{ exclusions: { id: string; name: string; description: string; category: string }[] } | null>(null)
  const [exAck, setExAck] = useState(false)
  const [upi, setUpi] = useState(user?.upi_id || '')
  const [busy, setBusy] = useState(false)
  const [payErr, setPayErr] = useState('')

  useEffect(() => {
    if (user?.upi_id) setUpi(user.upi_id)
  }, [user?.upi_id])

  useEffect(() => {
    client.get('/api/exclusions/').then((r) => setExclusions(r.data))
  }, [])

  useEffect(() => {
    if (step >= 1)
      client.get('/api/policies/preview/', { params: { tier } }).then((r) => setBreakdown(r.data))
  }, [tier, step])

  async function pay() {
    setBusy(true)
    setPayErr('')
    try {
      await client.post('/api/policies/purchase/', {
        tier,
        exclusions_acknowledged: true,
        exclusions_version: 'v1.0',
        ip_address: '127.0.0.1',
        device_fingerprint: 'demo',
        upi_id: upi.trim(),
      })
      await refreshProfile()
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } })
      setStep(4)
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const d = e.response?.data as { error?: string; detail?: string }
        const msg = d?.error || (typeof d?.detail === 'string' ? d.detail : null) || e.response?.statusText
        setPayErr(msg ? String(msg) : 'Payment failed. Please try again.')
      } else {
        setPayErr('Something went wrong.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="worker-layout min-h-screen pt-4 space-y-4">
      <div className="flex gap-2 text-label text-[10px] uppercase text-[var(--color-text-muted)]">
        {['Plan', 'Exclusions', 'Pay'].map((s, i) => (
          <span key={s} className={step >= i ? 'text-[var(--color-accent)]' : ''}>
            {i + 1}:{s}
          </span>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-3">
          <div className="flex flex-col gap-4 space-y-2">
            {TIERS.map((t) => {
              const selected = tier === t.id
              return (
                <motion.button
                  key={t.id}
                  type="button"
                  layout
                  onClick={() => setTier(t.id)}
                  whileTap={{ scale: 0.97 }}
                  animate={{
                    scale: selected ? 1.05 : 1,
                    opacity: selected ? 1 : 0.6,
                    y: selected ? -4 : 0,
                    boxShadow: selected
                      ? '0 20px 40px -10px rgba(0, 212, 170, 0.4), 0 0 20px rgba(0, 212, 170, 0.1)'
                      : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
                  }}
                  transition={tierSpring}
                  className={`
                    relative w-full text-left overflow-hidden
                    rounded-3xl border p-6 cursor-pointer select-none
                    backdrop-blur-xl bg-gradient-to-br from-[var(--color-bg-elevated)] to-[var(--color-bg-base)]
                    ${selected ? 'border-[var(--color-accent)] z-[1]' : 'border-white/5 hover:border-white/20 z-0 hover:opacity-100'}
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2
                  `}
                >
                  {selected ? (
                    <motion.div
                      layoutId="purchase-tier-ring"
                      className="pointer-events-none absolute inset-0 rounded-3xl"
                      style={{
                        boxShadow: 'inset 0 0 24px rgba(0, 212, 170, 0.15)',
                        background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.15) 0%, rgba(0,0,0,0) 100%)'
                      }}
                      transition={tierSpring}
                    />
                  ) : null}
                  {t.popular ? (
                    <motion.div
                      className="absolute top-0 right-0 bg-[var(--color-accent)] text-[var(--color-bg-base)] text-[9px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-3xl tracking-wider shadow-lg"
                      animate={{ opacity: selected ? 1 : 0.8 }}
                    >
                      POPULAR
                    </motion.div>
                  ) : null}
                  <div className="relative z-10 flex items-center justify-between h-full">
                    <div>
                      <p className={`font-display text-2xl font-bold mb-1 tracking-tight ${selected ? 'text-white' : 'text-gray-300'}`}>{t.label}</p>
                      <p className="text-3xl font-black bg-gradient-to-br from-[var(--color-accent)] to-[#4ade80] text-transparent bg-clip-text mb-2">₹{t.weekly}<span className="text-sm font-medium text-white/50 tracking-normal">/wk</span></p>
                      <p className="text-sm font-medium text-gray-400 flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        ₹{t.cover} cover
                      </p>
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
          <Button className="w-full" onClick={() => setStep(1)}>
            Continue
          </Button>
        </div>
      )}

      {step === 1 && (
        <>
          <PremiumBreakdown breakdown={breakdown} />
          <Button className="w-full" onClick={() => setStep(2)}>
            Continue to exclusions
          </Button>
        </>
      )}

      {step === 2 && exclusions && (
        <div className="flex flex-col h-[calc(100vh-140px)]">
          <div className="flex-1 min-h-0 mb-4">
            <ExclusionsPanel exclusions={exclusions.exclusions} checked={exAck} onChecked={setExAck} />
          </div>
          <Button className="w-full shrink-0" disabled={!exAck} onClick={() => setStep(3)}>
            Continue to payment
          </Button>
        </div>
      )}

      {step === 3 && (
        <Card className="border-blue-900/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-bold px-3 py-1 rounded-bl-xl tracking-wider z-10 shadow-lg">
            TEST MODE
          </div>
          <div className="relative z-10 pt-2">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/>
              </svg>
              <h3 className="font-display font-bold text-lg text-white tracking-tight">Razorpay Checkout</h3>
            </div>
            <label className="block text-sm font-medium text-gray-400 mb-2">VPA / UPI Handle</label>
            <input
              value={upi}
              onChange={(e) => setUpi(e.target.value)}
              placeholder="e.g. yourname@ybl"
              className="w-full rounded-xl bg-[var(--color-bg-base)] border border-blue-900/50 px-4 py-3 mb-6 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono text-white"
            />
            {payErr ? <p className="text-sm text-red-400 mb-4 font-medium px-1 block">{payErr}</p> : null}
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-500 text-white border-blue-500 hover:border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.3)]" 
              loading={busy} 
              onClick={() => void pay()}
            >
              Pay with Razorpay
            </Button>
          </div>
        </Card>
      )}

      {step === 4 && (
        <Card variant="success">
          <p className="text-h3 font-display text-emerald-400">You are covered</p>
          <p className="text-body-sm mt-2">Policy saved. Receipt available from claims once a payout occurs.</p>
        </Card>
      )}
      <BottomNav />
    </div>
  )
}
