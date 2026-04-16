import { NavLink, useLocation } from 'react-router-dom'

const items = [
  { to: '/dashboard', label: 'Home', icon: '⌂' },
  { to: '/purchase', label: 'Policy', icon: '◆' },
  { to: '/claims', label: 'Claims', icon: '☰' },
  { to: '/profile', label: 'Profile', icon: '○' },
]

export function BottomNav() {
  const location = useLocation()
  return (
    <nav className="bottom-nav">
      {items.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 text-[10px] gap-0.5 ${
              isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'
            }`
          }
        >
          <span className="text-xl">{icon}</span>
          <span>{label}</span>
          <span
            className={`h-1 w-1 rounded-full ${location.pathname === to ? 'bg-[var(--color-accent)]' : 'opacity-0'}`}
          />
        </NavLink>
      ))}
    </nav>
  )
}
