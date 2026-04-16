# GigShield — Professional UI Design System

### "Fintech meets street-level trust" — Design for gig workers who use phones, not laptops

---

## DESIGN PHILOSOPHY

GigShield's aesthetic direction: **"Dark Fintech Utility"**

Think Razorpay Dashboard × Zepto App × Linear.app — dark background, electric accent, razor-sharp typography, data-dense but never cluttered. This is money on the line. The UI must feel **safe, fast, and authoritative** while remaining approachable for a delivery worker who checks it between rides.

**The one thing users must remember:** *"This app is watching over me even when I'm not watching it."*

**Two audiences, one system:**

- **Workers (mobile-first):** Large touch targets, one action per screen, status-first information hierarchy. They glance, not read.
- **Admin (desktop):** Data-dense dashboards, multi-panel layouts, power-user keyboard shortcuts.

---

## DESIGN TOKENS (CSS Variables — `frontend/src/index.css`)

See the project file for the complete `:root` block (brand colors, accent teal, status colors, typography, spacing 8px grid, radius, shadows, transitions).

---

## TYPOGRAPHY SYSTEM

### Google Fonts Import (`frontend/index.html`)

- Preconnect `fonts.googleapis.com` / `fonts.gstatic.com`
- Load **Syne** (600, 700, 800), **DM Sans** (300–600), **JetBrains Mono** (400, 500)

### Type scale

Utility classes: `.text-display`, `.text-h1` … `.text-h3`, `.text-body-lg` / `.text-body` / `.text-body-sm`, `.text-label`, `.text-mono`, `.text-amount`

---

## COMPONENT LIBRARY

Implemented under `frontend/src/components/`:

| File | Purpose |
|------|---------|
| `ui/Card.tsx` | Base card, glow + danger/success variants |
| `ui/KPICard.tsx` | KPI display with optional delta |
| `ui/Button.tsx` | primary / outline / ghost / danger |
| `ui/Spinner.tsx` | Loading indicator for buttons |
| `ui/StatusBadge.tsx` | Claim/policy statuses with pulse dot |
| `ui/SkeletonCard.tsx` | Loading skeleton |
| `ui/EmptyState.tsx` | Empty lists |
| `FraudScoreMeter.tsx` | Semi-circle fraud gauge |
| `WeatherWidget.tsx` | Zone weather + risk |
| `PayoutTimeline.tsx` | Claim progress steps |

---

## PAGE-BY-PAGE DESIGN SPECS

### Worker Dashboard (`/dashboard`)

- Mobile-first column, max ~480px centered
- Header: GigShield, greeting, platform · zone · city, notifications/profile
- Hero **Active Policy** card: tier, coverage, progress, renew CTA
- Weather risk strip (rain / temp / AQI)
- **Earnings protected** animated counter + sparkline
- Claim cards + timeline entry

### Policy Purchase (`/purchase`)

- Stepper: **Plan → Zone → Exclusions → Pay**
- Tier cards (horizontal scroll on mobile); Standard = "MOST POPULAR"
- Zone + live **premium breakdown** ("Why this price?")
- **Exclusions:** scrollable list of 12 items, red/warning treatment; checkbox gated; Next disabled until acknowledged
- Pay: UPI input, confetti on success, PDF notice

### Claims History (`/claims`)

- Summary row: counts, totals
- Cards: trigger, date, fraud bar, status badge, amount, txn id (mono, copy)
- Detail drawer/sheet: timeline + fraud breakdown

### Admin Dashboard (`/admin`)

- Sidebar: Overview, Trigger Simulator, Workers, Fraud Alerts, Actuarial, Settings
- KPI row: premiums, claims paid, loss ratio (band-colored), solvency
- Recharts: loss ratio vs target
- Fraud heatmap table by zone
- **Trigger Simulator** + **live activity feed** (monospace, staggered animation)
- Manual review queue with approve/reject

---

## ANIMATIONS & MICRO-INTERACTIONS

- Framer Motion: `containerVariants` / `itemVariants` (stagger ~70ms)
- KPI count-up ~800ms
- Purchase success: **canvas-confetti** + checkmark
- Trigger fire: pulse ring on CTA
- Fraud meter: needle sweep ~1s
- Live feed: fade + slide from left
- Status badge: `animate-pulse` dot

---

## MOBILE-FIRST RESPONSIVE RULES

- `.worker-layout`: max-width 480px, centered, padding 16px
- Touch targets: min 48×48px for `button`, `a`, `.clickable`
- Bottom nav (≤768px): fixed, 64px + `env(safe-area-inset-bottom)`
- Worker tabs: Home | Policy | Claims | Profile

---

## TAILWIND CONFIG

`frontend/tailwind.config.js` extends `fontFamily` (display/body/mono), `brand` colors, `borderRadius`, `boxShadow` (glow, lifted), `animation` / `keyframes` (e.g. `fadeUp`).

---

## REFERENCE PRODUCTS

- **Razorpay Dashboard** — dark bg, teal/green accents, data density
- **Linear.app** — motion, clean type, keyboard-first
- **Zepto** — mobile cards, fast feedback
- **Stripe Radar** — fraud visualization, audit trails

---

*Design fast. Ship polished. Win the crowd.*
