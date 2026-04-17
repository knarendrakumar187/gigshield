import { useState } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import client from '../api/client'

const CITY_ZONES: Record<string, string[]> = {
  Mumbai: ['Andheri West', 'Andheri East', 'Kurla', 'Dharavi', 'Bandra', 'Borivali', 'Malad', 'Goregaon', 'Kandivali', 'Dahisar', 'Powai', 'Thane', 'Navi Mumbai'],
  Bengaluru: ['Koramangala', 'Whitefield', 'BTM Layout', 'Indiranagar', 'HSR Layout', 'Jayanagar', 'JP Nagar', 'Marathahalli', 'Electronic City', 'Hebbal', 'Yelahanka'],
  Delhi: ['Connaught Place', 'Lajpat Nagar', 'Saket', 'Dwarka', 'Rohini', 'Pitampura', 'Janakpuri', 'Karol Bagh', 'Preet Vihar', 'Vasant Kunj'],
  Hyderabad: ['Hitech City', 'Banjara Hills', 'Jubilee Hills', 'Gachibowli', 'Madhapur', 'Kondapur', 'Kukatpally', 'Secunderabad', 'Ameerpet'],
  Chennai: ['T. Nagar', 'Adyar', 'Velachery', 'Anna Nagar', 'Mylapore', 'Porur', 'Tambaram', 'Chromepet', 'Guindy', 'Perambur'],
  Kolkata: ['Salt Lake', 'Park Street', 'Howrah', 'Rajarhat', 'Dum Dum', 'Ballygunge', 'Bhowanipore', 'New Town', 'Kasba'],
  Pune: ['Baner', 'Hinjewadi', 'Kothrud', 'Shivajinagar', 'Viman Nagar', 'Kharadi', 'Wakad', 'Aundh', 'Hadapsar', 'Pimple Saudagar'],
  Ahmedabad: ['Bopal', 'Satellite', 'Navrangpura', 'Thaltej', 'Prahlad Nagar', 'Maninagar', 'Vastrapur', 'Gota', 'Chandkheda'],
  Jaipur: ['Vaishali Nagar', 'C-Scheme', 'Malviya Nagar', 'Mansarovar', 'Tonk Road', 'Sanganer', 'Jagatpura'],
  Lucknow: ['Gomti Nagar', 'Hazratganj', 'Aliganj', 'Indira Nagar', 'Vikas Nagar', 'Alambagh', 'Charbagh'],
  Kochi: ['Ernakulam', 'Edappally', 'Kakkanad', 'Kalamassery', 'Vyttila', 'Aluva', 'Thripunithura'],
  Surat: ['Varachha', 'Adajan', 'Vesu', 'Dumas', 'Katargam', 'Udhna', 'Piplod'],
  Nagpur: ['Nagpur West', 'Wadi', 'Ramdaspeth', 'Dharampeth', 'Sadar', 'Sitabuldi', 'Manish Nagar'],
  Chandigarh: ['Sector 17', 'Sector 34', 'Industrial Area', 'Sector 22', 'Sector 43', 'Mohali'],
  Vijayawada: ['Benz Circle', 'Labbipet', 'Governorpet', 'Kanur', 'Patamata', 'One Town'],
  Guntur: ['Brodipet', 'Arundelpet', 'Kothapet', 'Lakshmipuram', 'Nallapadu'],
  Noida: ['Sector 18', 'Sector 62', 'Sector 137', 'Greater Noida', 'Sector 44', 'Sector 63'],
  Gurgaon: ['Cyber City', 'DLF Phase 1', 'Sohna Road', 'Golf Course Road', 'Sector 14', 'MG Road'],
  Faridabad: ['NIT', 'Sector 16', 'Old Faridabad', 'Ballabhgarh'],
  Indore: ['Vijay Nagar', 'AB Road', 'Palasia', 'Rau', 'Sudama Nagar'],
  Bhopal: ['MP Nagar', 'Kolar Road', 'Shahpura', 'Arera Colony'],
  Coimbatore: ['RS Puram', 'Gandhipuram', 'Peelamedu', 'Saibaba Colony', 'Singanallur'],
  Vadodara: ['Alkapuri', 'Fatehgunj', 'Manjalpur', 'Gorwa', 'Productivity Road'],
  Visakhapatnam: ['Dwaraka Nagar', 'Gajuwaka', 'Madhurawada', 'Kommadi', 'MVP Colony'],
  Patna: ['Boring Road', 'Kankarbagh', 'Patna Sahib', 'Bailey Road', 'Rajendra Nagar'],
  Agra: ['Civil Lines', 'Sanjay Place', 'Shahganj', 'Kamla Nagar'],
  Nashik: ['Gangapur Road', 'Cidco', 'Indira Nagar', 'College Road'],
  Rajkot: ['Kalawad Road', 'Gondal Road', 'Mavdi', 'University Road'],
  Madurai: ['Anna Nagar', 'KK Nagar', 'Mattuthavani', 'Arasaradi'],
  Thiruvananthapuram: ['Pattom', 'Vanchiyoor', 'Kazhakuttam', 'Kowdiar'],
  Mysuru: ['Hebbal', 'VV Mohalla', 'Vijayanagar'],
  Dehradun: ['Rajpur Road', 'Patel Nagar', 'Ballupur'],
  Varanasi: ['Sarnath', 'Lanka', 'BHU Area', 'Sigra'],
  Amritsar: ['Lawrence Road', 'Ranjit Avenue', 'GT Road'],
  Jodhpur: ['Paota', 'Sardarpura', 'Ratanada'],
  'Other City': ['Other Zone'],
}

const ALL_PLATFORMS = [
  { value: 'SWIGGY', label: 'Swiggy' },
  { value: 'ZOMATO', label: 'Zomato' },
  { value: 'AMAZON_FLEX', label: 'Amazon Flex' },
  { value: 'BLINKIT', label: 'Blinkit' },
  { value: 'FLIPKART', label: 'Flipkart Quick' },
  { value: 'DUNZO', label: 'Dunzo' },
  { value: 'PORTER', label: 'Porter' },
  { value: 'ZEPTO', label: 'Zepto' },
  { value: 'BIGBASKET', label: 'BigBasket BB Now' },
  { value: 'SHADOWFAX', label: 'Shadowfax' },
  { value: 'ECOM_EXPRESS', label: 'Ecom Express' },
  { value: 'DELHIVERY', label: 'Delhivery' },
]

export default function LoginPage() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setU] = useState('')
  const [password, setP] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState<string>('Mumbai')
  const [zone, setZone] = useState<string>('Andheri West')
  const [customCity, setCustomCity] = useState('')
  const [customZone, setCustomZone] = useState('')
  const [platform, setPlatform] = useState<string>('SWIGGY')
  const [earnings, setEarnings] = useState('')
  const [upi, setUpi] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  // Verification state
  const [workerId, setWorkerId] = useState('')
  const [aadhaarLast4, setAadhaarLast4] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifiedToken, setVerifiedToken] = useState('')
  const [verifyErr, setVerifyErr] = useState<Record<string, string>>({})

  const PLATFORM_HINTS: Record<string, string> = {
    SWIGGY: 'SW-123456', ZOMATO: 'ZM-12345', AMAZON_FLEX: 'AF-AB1234',
    BLINKIT: 'BL-12345', FLIPKART: 'FK-123456', DUNZO: 'DZ-12345',
    PORTER: 'PR-12345', ZEPTO: 'ZP-12345', BIGBASKET: 'BB-12345',
    SHADOWFAX: 'SFX-12345', ECOM_EXPRESS: 'EE-12345', DELHIVERY: 'DL-123456',
  }

  // One-click demo data per platform
  const DEMO_MOCK: Record<string, { worker_id: string; aadhaar: string }> = {
    SWIGGY:       { worker_id: 'SW-847291', aadhaar: '4782' },
    ZOMATO:       { worker_id: 'ZM-93847', aadhaar: '5591' },
    AMAZON_FLEX:  { worker_id: 'AF-AX7823', aadhaar: '3310' },
    BLINKIT:      { worker_id: 'BL-66123', aadhaar: '9921' },
    FLIPKART:     { worker_id: 'FK-112233', aadhaar: '7743' },
    DUNZO:        { worker_id: 'DZ-55678', aadhaar: '2281' },
    PORTER:       { worker_id: 'PR-44512', aadhaar: '8833' },
    ZEPTO:        { worker_id: 'ZP-73291', aadhaar: '6647' },
    BIGBASKET:    { worker_id: 'BB-29184', aadhaar: '1192' },
    SHADOWFAX:    { worker_id: 'SFX-83021', aadhaar: '4456' },
    ECOM_EXPRESS: { worker_id: 'EE-92837', aadhaar: '7723' },
    DELHIVERY:    { worker_id: 'DL-448821', aadhaar: '0091' },
  }

  function fillDemoData() {
    const demo = DEMO_MOCK[platform] ?? DEMO_MOCK['SWIGGY']
    setWorkerId(demo.worker_id)
    setAadhaarLast4(demo.aadhaar)
    setVerifyErr({})
    setVerifiedToken('')
  }

  const isOtherCity = city === 'Other City'
  const effectiveCity = isOtherCity ? customCity : city
  const effectiveZone = isOtherCity || zone === 'Other Zone' ? customZone : zone

  async function verifyWorker() {
    setVerifying(true)
    setVerifyErr({})
    setVerifiedToken('')
    try {
      const res = await client.post('/api/auth/verify-worker/', {
        platform, worker_id: workerId, aadhaar_last4: aadhaarLast4, username,
      })
      setVerifiedToken(res.data.verification_token)
    } catch (e) {
      if (axios.isAxiosError(e)) {
        setVerifyErr(e.response?.data?.errors ?? { general: 'Verification failed' })
      }
    } finally {
      setVerifying(false)
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const role = await login(username, password)
        nav(role === 'ADMIN' ? '/admin' : '/how-it-works', { replace: true })
      } else {
        await client.post('/api/auth/register/', {
          username,
          email,
          password,
          phone,
          city: effectiveCity,
          zone: effectiveZone,
          platform,
          avg_daily_earnings: earnings || '0',
          upi_id: upi,
        })
        // After registering, call verify-worker if token obtained (best-effort)
        if (verifiedToken && workerId && aadhaarLast4) {
          await client.post('/api/auth/verify-worker/', {
            platform, worker_id: workerId, aadhaar_last4: aadhaarLast4, username,
          }).catch(() => {})
        }
        const role = await login(username, password)
        nav(role === 'ADMIN' ? '/admin' : '/how-it-works', { replace: true })
      }
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const resp = e.response
        const data = resp?.data
        if (data) {
          // Some failures return HTML (e.g. 404 page). Render a clean message instead of dumping raw HTML.
          if (typeof data === 'string') {
            const titleMatch = data.match(/<title[^>]*>([^<]*)<\/title>/i)
            const msg = titleMatch?.[1]?.trim() || data.replace(/<[^>]+>/g, ' ').trim()
            setErr(msg ? msg.slice(0, 200) : 'Request failed')
            return
          }

          // Typical DRF validation errors come as an object: {field: ["msg", ...], ...}
          if (typeof data === 'object') {
            const messages: string[] = []
            for (const [field, value] of Object.entries(data as Record<string, string[] | string | unknown>)) {
              if (Array.isArray(value)) messages.push(`${field}: ${value.join(', ')}`)
              else if (typeof value === 'string') messages.push(value)
              else if (value && typeof value === 'object' && 'detail' in value && typeof (value as any).detail === 'string') messages.push((value as any).detail)
            }
            setErr(messages.join(' • ') || 'Request failed')
            return
          }
        }
        setErr(resp?.statusText || 'Request failed')
      } else {
        setErr('Something went wrong')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="worker-layout min-h-screen flex flex-col justify-center py-12">
      <Card className="max-w-md mx-auto w-full">
        <h1 className="text-h2 font-display text-[var(--color-text-primary)] mb-2">GigShield</h1>
        <div className="flex gap-2 mb-4 text-body-sm">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 rounded-full px-3 py-2 ${mode === 'login' ? 'bg-[var(--color-accent)] text-black' : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]'}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 rounded-full px-3 py-2 ${mode === 'register' ? 'bg-[var(--color-accent)] text-black' : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]'}`}
          >
            Register
          </button>
        </div>
        <p className="text-body-sm text-[var(--color-text-secondary)] mb-4">
          {mode === 'login' ? 'Worker login' : 'Create a new worker account'}
        </p>

        {/* ── Demo Credentials (Rider only) ────────────────────────── */}
        {mode === 'login' && (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-3 mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🛵</span>
              <p className="text-xs font-semibold text-white">Demo Rider Account</p>
            </div>
            <button
              type="button"
              onClick={() => { setU('rider'); setP('rider123') }}
              className="text-[11px] font-bold text-blue-400 bg-blue-900/30 hover:bg-blue-800/50 border border-blue-600/40 px-3 py-1.5 rounded-full transition-all whitespace-nowrap"
            >
              ⚡ Demo Fill
            </button>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            className="w-full rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-4 py-3 text-[var(--color-text-primary)]"
            placeholder="Username"
            value={username}
            onChange={(e) => setU(e.target.value)}
            required
            autoComplete="off"
          />
          {mode === 'register' && (
            <>
              <input
                className="w-full rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-4 py-3 text-[var(--color-text-primary)]"
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="off"
              />
              <input
                className="w-full rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-4 py-3 text-[var(--color-text-primary)]"
                placeholder="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoComplete="off"
              />
              {/* City select */}
              <div className="flex gap-2 overflow-hidden w-full">
                <select
                  className="min-w-0 flex-1 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-3 py-3 text-[var(--color-text-primary)] text-sm truncate"
                  value={city}
                  onChange={(e) => {
                    const nextCity = e.target.value
                    setCity(nextCity)
                    setZone(CITY_ZONES[nextCity]?.[0] ?? 'Other Zone')
                    setCustomZone('')
                  }}
                  required
                >
                  {Object.keys(CITY_ZONES).map((c) => (
                    <option key={c} value={c}>{c === 'Other City' ? '✏️ Other City' : c}</option>
                  ))}
                </select>

                {/* Zone select or manual input */}
                {!isOtherCity && (
                  <select
                    className="min-w-0 flex-1 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-3 py-3 text-[var(--color-text-primary)] text-sm truncate"
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    required
                  >
                    {CITY_ZONES[city]?.map((z) => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Manual city + zone inputs stacked vertically when Other City selected */}
              {isOtherCity && (
                <>
                  <input
                    className="w-full rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-accent)]/50 px-4 py-3 text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
                    placeholder="Enter your city name (e.g. Tirupati)"
                    value={customCity}
                    onChange={(e) => setCustomCity(e.target.value)}
                    required
                  />
                  <input
                    className="w-full rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-accent)]/50 px-4 py-3 text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
                    placeholder="Enter your zone / area (e.g. Balaji Nagar)"
                    value={customZone}
                    onChange={(e) => setCustomZone(e.target.value)}
                    required
                  />
                </>
              )}

              {/* Platform and Earnings */}
              <div className="flex flex-col gap-2">
                <select
                  className="w-full rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-4 py-3 text-[var(--color-text-primary)]"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                >
                  {ALL_PLATFORMS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <input
                  className="w-full rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-4 py-3 text-[var(--color-text-primary)]"
                  placeholder="Daily earnings (₹)"
                  type="number"
                  min="0"
                  value={earnings}
                  onChange={(e) => setEarnings(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <input
                className="w-full rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-4 py-3 text-[var(--color-text-primary)]"
                placeholder="UPI ID"
                value={upi}
                onChange={(e) => setUpi(e.target.value)}
                autoComplete="off"
              />

              {/* ── Worker Verification Panel ─────────────────────────────── */}
              <div className={`rounded-2xl border px-4 py-4 space-y-3 transition-all ${verifiedToken ? 'border-emerald-500/60 bg-emerald-950/20' : 'border-amber-500/30 bg-amber-950/10'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 text-base">🛡️</span>
                    <p className="text-sm font-semibold text-white">Verify you're a valid rider</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {verifiedToken && (
                      <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-900/40 px-2 py-1 rounded-full border border-emerald-500/40">
                        ✅ Verified
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={fillDemoData}
                      className="text-[10px] font-bold text-blue-400 bg-blue-900/30 hover:bg-blue-800/40 border border-blue-600/40 px-2 py-1 rounded-full transition-all"
                    >
                      ⚡ Demo Fill
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-400">Enter your Partner ID from your delivery app + last 4 digits of Aadhaar. This is simulated for demo purposes.</p>

                <div className="flex gap-2">
                  <div className="flex-1 min-w-0">
                    <input
                      className={`w-full rounded-xl bg-[var(--color-bg-base)] border px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 transition-all font-mono ${verifyErr.worker_id ? 'border-red-500 focus:ring-red-500' : 'border-white/10 focus:border-amber-400 focus:ring-amber-400'}`}
                      placeholder={`e.g. ${PLATFORM_HINTS[platform] ?? 'Partner ID'}`}
                      value={workerId}
                      onChange={(e) => { setWorkerId(e.target.value); setVerifyErr({}); setVerifiedToken('') }}
                    />
                    {verifyErr.worker_id && <p className="text-red-400 text-[10px] mt-1 px-1">{verifyErr.worker_id}</p>}
                  </div>
                  <div className="w-28 shrink-0">
                    <input
                      className={`w-full rounded-xl bg-[var(--color-bg-base)] border px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 transition-all font-mono text-center tracking-widest ${verifyErr.aadhaar_last4 ? 'border-red-500 focus:ring-red-500' : 'border-white/10 focus:border-amber-400 focus:ring-amber-400'}`}
                      placeholder="XXXX"
                      maxLength={4}
                      value={aadhaarLast4}
                      onChange={(e) => { setAadhaarLast4(e.target.value.replace(/\D/g, '')); setVerifyErr({}); setVerifiedToken('') }}
                    />
                    {verifyErr.aadhaar_last4 && <p className="text-red-400 text-[10px] mt-1 px-1">{verifyErr.aadhaar_last4}</p>}
                    <p className="text-gray-500 text-[10px] mt-1 text-center">Aadhaar last 4</p>
                  </div>
                </div>

                {verifyErr.general && <p className="text-red-400 text-xs">{verifyErr.general}</p>}

                {verifiedToken ? (
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
                    <span>✅ Identity verified (Simulated)</span>
                    <span className="font-mono text-emerald-600 text-[10px] truncate">{verifiedToken}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => void verifyWorker()}
                    disabled={verifying || !workerId || !aadhaarLast4}
                    className="w-full py-2 rounded-xl text-sm font-semibold border border-amber-500/50 text-amber-400 hover:bg-amber-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    {verifying ? '⏳ Verifying...' : '🔍 Verify My Identity'}
                  </button>
                )}
              </div>
            </>
          )}
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
            {mode === 'login' ? 'Sign in' : 'Register & continue'}
          </Button>
        </form>
        <p className="text-body-sm text-[var(--color-text-muted)] mt-4">
          Admin?{' '}
          <Link className="text-[var(--color-accent)]" to="/admin-login">
            Admin dashboard
          </Link>
        </p>
      </Card>
    </div>
  )
}
