import { Link } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

export default function HowItWorksPage() {
  const steps = [
    {
      title: '1. Register Your Profile',
      desc: 'Sign up with your delivery platform details. We verify your identity using simulated Aadhaar & Partner ID checks.',
      icon: '👤',
    },
    {
      title: '2. Activate a Policy',
      desc: 'Purchase a weekly protection plan (starting at ₹29). Your coverage is active immediately for the current week.',
      icon: '🛡️',
    },
    {
      title: '3. Automatic Detection',
      desc: 'Our system monitors real-time weather in your city. If a heavy rain or heat event occurs, we detect it instantly.',
      icon: '🌦️',
    },
    {
      title: '4. AI Fraud Check',
      desc: 'Our ML models verify the disruption against your zone and behavioral patterns to ensure quick, honest payouts.',
      icon: '🤖',
    },
    {
      title: '5. Instant Payout',
      desc: 'Approved claims are paid directly to your UPI ID within seconds. No manual filing, no paperwork, no waiting.',
      icon: '⚡',
    },
  ]

  return (
    <div className="worker-layout pb-24 pt-4 space-y-6">
      <header>
        <h1 className="text-h2 font-display">How GigShield Works</h1>
        <p className="text-body-sm text-[var(--color-text-secondary)] mt-1">
          Parametric income protection for India's 10 million gig workers.
        </p>
      </header>

      <section className="space-y-4">
        {steps.map((s, i) => (
          <div key={i} className="flex gap-4 group">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] flex items-center justify-center text-xl shadow-sm group-hover:border-[var(--color-accent)] transition-colors">
              {s.icon}
            </div>
            <div className="space-y-1">
              <h3 className="text-body font-bold text-white">{s.title}</h3>
              <p className="text-body-sm text-gray-400 leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </section>

      <Card className="bg-emerald-900/10 border-emerald-500/30">
        <h3 className="text-emerald-400 font-bold mb-2 flex items-center gap-2">
          <span>💡</span> The Parametric Advantage
        </h3>
        <p className="text-[12px] text-emerald-100/80 leading-relaxed">
          Traditional insurance takes weeks to pay after you fill tons of forms. 
          GigShield uses <strong>Triggers</strong> (like rain &gt; 50mm). 
          When the trigger fires, you get paid automatically. No forms needed.
        </p>
      </Card>

      <div className="text-center py-4 space-y-4">
        <Link to="/dashboard">
          <Button className="w-full bg-[var(--color-accent)] text-black font-bold py-4">
            Got it, Let's go! 🚀
          </Button>
        </Link>
        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
          GigShield © 2026 · All Rights Reserved
        </p>
      </div>

      <BottomNav />
    </div>
  )
}
