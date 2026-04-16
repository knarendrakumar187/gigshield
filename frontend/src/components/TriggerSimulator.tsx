import { useState } from 'react'
import axios from 'axios'
import client from '../api/client'
import { Button } from './ui/Button'
import { Card } from './ui/Card'

const TYPES = ['ALL', 'RAIN', 'HEAT', 'AQI', 'FLOOD', 'ZONE_CLOSURE', 'CURFEW']

const CITY_ZONES: Record<string, string[]> = {
  ALL: ['ALL'],
  Mumbai: ['ALL', 'Andheri West', 'Kurla', 'Dharavi', 'Bandra'],
  Bengaluru: ['ALL', 'Koramangala', 'Whitefield', 'BTM Layout'],
  Delhi: ['ALL', 'Connaught Place', 'Lajpat Nagar'],
  Hyderabad: ['ALL', 'Hitech City', 'Banjara Hills'],
  Chennai: ['ALL', 'T. Nagar', 'Adyar', 'Velachery', 'Anna Nagar', 'Mylapore'],
  Kolkata: ['ALL', 'Salt Lake', 'Park Street', 'Howrah', 'Rajarhat'],
  Pune: ['ALL', 'Baner', 'Hinjewadi', 'Kothrud', 'Shivajinagar', 'Viman Nagar'],
  Ahmedabad: ['ALL', 'Bopal', 'Satellite', 'Navrangpura', 'Thaltej'],
  Jaipur: ['ALL', 'Vaishali Nagar', 'C-Scheme', 'Malviya Nagar', 'Mansarovar'],
  Lucknow: ['ALL', 'Gomti Nagar', 'Hazratganj', 'Aliganj'],
  Kochi: ['ALL', 'Ernakulam', 'Edappally', 'Kakkanad', 'Kalamassery'],
  Surat: ['ALL', 'Varachha', 'Adajan', 'Vesu', 'Dumas'],
  Nagpur: ['ALL', 'Nagpur West', 'Wadi', 'Ramdaspeth', 'Dharampeth'],
  Chandigarh: ['ALL', 'Sector 17', 'Sector 34', 'Industrial Area'],
  Vijayawada: ['ALL', 'Benz Circle', 'Labbipet', 'Governorpet', 'Kanur', 'Patamata'],
  Guntur: ['ALL', 'Brodipet', 'Arundelpet', 'Kothapet', 'Lakshmipuram'],
}

export function TriggerSimulator({ onFired }: { onFired?: () => void }) {
  const [type, setType] = useState('ALL')
  const [city, setCity] = useState('ALL')
  const [zone, setZone] = useState('ALL')
  const [severity, setSeverity] = useState(4)
  const [duration, setDuration] = useState(3)
  const [precisionMode, setPrecisionMode] = useState(false)
  const [lat, setLat] = useState('19.1136')
  const [lon, setLon] = useState('72.8697')
  const [radius, setRadius] = useState('2.5')
  const [feed, setFeed] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  async function fire() {
    setLoading(true)
    setFeed((f) => [`${new Date().toLocaleTimeString()} — Firing ${type}…`, ...f])
    try {
      await client.post('/api/admin/triggers/create/', {
        trigger_type: type,
        city,
        zone,
        severity,
        duration_hours: duration,
        actual_value: 100,
        threshold_value: 50,
        source: 'MANUAL',
        ...(precisionMode && { affected_lat: parseFloat(lat), affected_lon: parseFloat(lon), radius_km: parseFloat(radius) })
      })
      setFeed((f) => [`${new Date().toLocaleTimeString()} — Trigger queued; Celery processing…`, ...f])
      onFired?.()
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 403)
        setFeed((f) => [`${new Date().toLocaleTimeString()} — Forbidden (admin only)`, ...f])
      else setFeed((f) => [`${new Date().toLocaleTimeString()} — Error (is backend running?)`, ...f])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card className="h-full flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-h3 font-display">Trigger simulator</h3>
          <button
            onClick={() => {
              setType('ALL');
              setCity('ALL');
              setZone('ALL');
            }}
            className="text-xs font-semibold text-amber-400 bg-amber-900/30 hover:bg-amber-800/50 border border-amber-600/40 px-3 py-1.5 rounded-full transition-all whitespace-nowrap"
          >
            ⚡ Select ALL
          </button>
        </div>
        <div className="space-y-3 text-body-sm flex-1">
          <label className="block space-y-1">
            <span className="text-label text-[var(--color-text-muted)]">Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] p-2 text-[var(--color-text-primary)]"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            City
            <select
              value={city}
              onChange={(e) => {
                const nextCity = e.target.value
                setCity(nextCity)
                const firstZone = CITY_ZONES[nextCity]?.[0]
                if (firstZone) setZone(firstZone)
              }}
              className="w-full rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] p-2 text-[var(--color-text-primary)]"
            >
              {Object.keys(CITY_ZONES).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            Zone
            <select
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="w-full rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] p-2 text-[var(--color-text-primary)]"
            >
              {(CITY_ZONES[city] ?? []).map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            Severity {severity}
            <input type="range" min={1} max={5} value={severity} onChange={(e) => setSeverity(+e.target.value)} className="w-full" />
          </label>
          <label className="block space-y-1">
            Duration (h)
            <input
              type="number"
              min={1}
              max={168}
              value={duration}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10)
                setDuration(Number.isFinite(n) && n >= 1 ? Math.min(n, 168) : 1)
              }}
              className="w-full rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] p-2"
            />
          </label>
        </div>

        <div className="mt-4 pt-4 border-t border-[var(--color-border)] shrink-0">
          <label className="flex items-center gap-2 text-label mb-2 cursor-pointer border border-[var(--color-border)] rounded-lg p-2 bg-[var(--color-bg-elevated)] transition-colors data-[active=true]:border-[var(--color-accent)]" data-active={precisionMode}>
            <input type="checkbox" checked={precisionMode} onChange={e => setPrecisionMode(e.target.checked)} className="rounded bg-[var(--color-bg-base)] border-[var(--color-border)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]" />
            📍 Precision Mode
          </label>
          
          {precisionMode && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              <label className="block space-y-1">
                <span className="text-xs text-[var(--color-text-muted)]">Epicenter Lat</span>
                <input type="number" step="0.0001" value={lat} onChange={e => setLat(e.target.value)} className="w-full rounded bg-[var(--color-bg-base)] border border-[var(--color-border)] p-2 text-sm text-[var(--color-text-primary)]" />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-[var(--color-text-muted)]">Epicenter Lon</span>
                <input type="number" step="0.0001" value={lon} onChange={e => setLon(e.target.value)} className="w-full rounded bg-[var(--color-bg-base)] border border-[var(--color-border)] p-2 text-sm text-[var(--color-text-primary)]" />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-[var(--color-text-muted)]">Radius (km)</span>
                <input type="number" step="0.1" value={radius} onChange={e => setRadius(e.target.value)} className="w-full rounded bg-[var(--color-bg-base)] border border-[var(--color-border)] p-2 text-sm text-[var(--color-text-primary)]" />
              </label>
            </div>
          )}
        </div>

        <Button className="w-full mt-4 shrink-0" onClick={() => void fire()} loading={loading}>
          {precisionMode ? '🔥 FIRE TRIGGER (PRECISE)' : 'Fire trigger'}
        </Button>
      </Card>
      <Card className="h-full flex flex-col overflow-hidden">
        <h3 className="text-label text-[var(--color-text-muted)] mb-2 shrink-0">Live activity</h3>
        <div className="font-mono text-xs space-y-1 flex-1 overflow-y-auto text-[var(--color-text-secondary)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {feed.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      </Card>
    </>
  )
}
