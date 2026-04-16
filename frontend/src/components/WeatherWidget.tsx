import { Card } from "./ui/Card"
import { StatusBadge } from "./ui/StatusBadge"

const RISK_COLORS: Record<string, string> = {
  low: "#22C55E",
  medium: "#F59E0B",
  high: "#EF4444",
  critical: "#DC2626",
}

type WeatherStatProps = { icon: string; label: string; value: string | number; threshold: number }

function WeatherStat({ icon, label, value, threshold }: WeatherStatProps) {
  const numeric = typeof value === "string" ? parseFloat(String(value).replace(/[^\d.-]/g, "")) : value
  const over = typeof numeric === "number" && !Number.isNaN(numeric) && numeric > threshold
  return (
    <div className={`rounded-lg p-2 text-center ${over ? "bg-red-500/10" : "bg-[var(--color-bg-elevated)]"}`}>
      <div className="text-lg">{icon}</div>
      <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-mono font-medium ${over ? "text-red-400" : "text-[var(--color-text-primary)]"}`}>{value}</p>
    </div>
  )
}

export type WeatherWidgetProps = {
  city: string
  zone: string
  weather: {
    risk: keyof typeof RISK_COLORS
    risk_message?: string
    rain_6h: number
    temp: number
    aqi: number
    humidity_2m_max?: number
    condition?: string
  }
}

export function WeatherWidget({ city, zone, weather }: WeatherWidgetProps) {
  const rc = RISK_COLORS[weather.risk] ?? RISK_COLORS.low
  const riskLabel = weather.risk === 'low' ? 'Low' : weather.risk === 'medium' ? 'Moderate' : 'High'
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: `radial-gradient(ellipse at top right, ${rc}, transparent 70%)` }} />
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-label text-[var(--color-text-muted)]">Live Weather</p>
            <p className="font-display text-lg font-bold text-[var(--color-text-primary)] mt-0.5">
              {city} • {weather.condition ?? 'Partly Cloudy'}
            </p>
            {zone ? (
              <p className="text-body-sm text-[var(--color-text-secondary)] mt-1">
                {zone}
              </p>
            ) : null}
          </div>
          <StatusBadge status={weather.risk === "low" ? "ACTIVE" : "PENDING"} />
        </div>
        <div className="grid grid-cols-4 gap-3 mt-4">
          <WeatherStat icon="Temp" label="Temp" value={`${weather.temp}C`} threshold={42} />
          <WeatherStat icon="Hum" label="Humidity" value={`${Math.round(weather.humidity_2m_max ?? 0)}%`} threshold={80} />
          <WeatherStat icon="Rain" label="Rain" value={`${weather.rain_6h}mm`} threshold={50} />
          <div className={`rounded-lg p-2 text-center bg-[var(--color-bg-elevated)]`}>
            <div className="text-lg" aria-hidden>
              ⚑
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">Risk</p>
            <p className={`text-sm font-mono font-medium ${weather.risk !== 'low' ? 'text-amber-400' : 'text-[var(--color-text-primary)]'}`}>
              {riskLabel}
            </p>
          </div>
        </div>
        {weather.risk !== "low" ? (
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex gap-2">
            <span aria-hidden>!</span>
            <p className="text-xs text-amber-400 font-medium">
              {weather.risk_message ?? "Elevated disruption risk"} — your policy is active.
            </p>
          </div>
        ) : null}
      </div>
    </Card>
  )
}