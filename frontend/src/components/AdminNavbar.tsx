import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function AdminNavbar({
  title,
  subtitle,
  rightElement,
}: {
  title: string
  subtitle?: React.ReactNode
  rightElement?: React.ReactNode
}) {
  const { logout } = useAuth()
  const nav = useNavigate()

  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[var(--color-bg-elevated)] border border-[var(--color-border)] p-4 rounded-[20px] mb-6 shadow-lg gap-4">
      <div>
        <h1 className="text-h1 font-display">{title}</h1>
        {subtitle && <p className="text-body-sm text-[var(--color-text-secondary)]">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
        <nav className="flex items-center gap-6 mr-2 border-r border-[var(--color-border)] pr-6 whitespace-nowrap">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `text-body font-semibold transition-colors ${
                isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:text-white'
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/admin/workers"
            className={({ isActive }) =>
              `text-body font-semibold transition-colors ${
                isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:text-white'
              }`
            }
          >
            Active Workers
          </NavLink>
          <NavLink
            to="/admin/claims-review"
            className={({ isActive }) =>
              `text-body font-semibold transition-colors ${
                isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:text-white'
              }`
            }
          >
            Manual Review
          </NavLink>

          <NavLink
            to="/admin/triggers"
            className={({ isActive }) =>
              `text-body font-semibold transition-colors ${
                isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:text-white'
              }`
            }
          >
            Triggers
          </NavLink>
          <button
            onClick={() => {
              logout()
              nav('/admin-login')
            }}
            className="text-body font-semibold text-red-500 hover:text-red-400 transition-colors"
          >
            Log out
          </button>
        </nav>
        {rightElement}
      </div>
    </header>
  )
}
