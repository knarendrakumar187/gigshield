import { motion } from 'framer-motion'
import { Card } from './ui/Card'
import { formatInr } from '../api/client'

export function PremiumBreakdown({ breakdown }: { breakdown: Record<string, unknown> | null }) {
  if (!breakdown) return null
  const mults = (breakdown.multipliers_applied as { factor: string; adjustment: string; reason: string }[]) || []
  return (
    <Card>
      <p className="text-label text-[var(--color-text-muted)] mb-3">Why this price?</p>
      <div className="space-y-2 text-body-sm">
        <div className="flex justify-between">
          <span>Base premium</span>
          <span className="font-mono">{formatInr(Number(breakdown.base_premium))}</span>
        </div>
        {mults.map((m, i) => (
          <motion.div
            key={m.factor}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex justify-between text-[var(--color-text-secondary)]"
          >
            <span>{m.reason}</span>
            <span className="font-mono">{m.adjustment}</span>
          </motion.div>
        ))}
        <hr className="border-[var(--color-border)]" />
        <div className="flex justify-between text-[var(--color-text-primary)] font-semibold">
          <span>Weekly premium</span>
          <span className="text-amount !text-xl">{formatInr(Number(breakdown.final_premium))}</span>
        </div>
      </div>
    </Card>
  )
}
