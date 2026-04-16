import type { ReactNode } from "react"
import { Card } from "./Card"

export type KPICardProps = {
  label: string
  value: ReactNode
  unit?: string
  delta?: number
  icon?: ReactNode
}

export function KPICard({ label, value, unit, delta, icon }: KPICardProps) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-label text-[var(--color-text-muted)] truncate mr-2" title={label}>{label}</span>
        <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-dim)] flex items-center justify-center">{icon}</div>
      </div>
      <div className="flex items-end gap-2 min-w-0">
        <span className="font-body text-2xl lg:text-[28px] font-bold tabular-nums tracking-tight leading-none text-[var(--color-text-primary)] truncate" title={String(value)}>{value}</span>
        {unit ? <span className="text-[var(--color-text-muted)] text-sm mb-0.5 whitespace-nowrap">{unit}</span> : null}
      </div>
      {delta != null ? (
        <div className={`flex items-center gap-1 text-xs font-medium ${delta > 0 ? "text-emerald-400" : "text-red-400"}`}>
          <span>{delta > 0 ? "↑" : "↓"} {Math.abs(delta)}%</span>
          <span className="text-[var(--color-text-muted)]">vs last week</span>
        </div>
      ) : null}
    </Card>
  )
}