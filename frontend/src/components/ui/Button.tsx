import type { ButtonHTMLAttributes, ReactNode } from "react"
import { Spinner } from "./Spinner"

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "danger"
  loading?: boolean
  children: ReactNode
}

export function Button({
  children,
  variant = "primary",
  loading = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`
      relative flex items-center justify-center gap-2 px-6 py-3 rounded-xl
      font-body font-semibold text-sm transition-all duration-200
      active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
      ${variant === "primary" ? "bg-[var(--color-accent)] text-[#0A0D14] hover:bg-[var(--color-accent-hover)] hover:shadow-[0_0_24px_rgba(0,212,170,0.4)]" : ""}
      ${variant === "outline" ? "bg-transparent border border-[var(--color-border-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent-dim)]" : ""}
      ${variant === "ghost" ? "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]" : ""}
      ${variant === "danger" ? "bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]" : ""}
      ${className}
    `.trim()}
      {...props}
    >
      {loading ? <Spinner size={16} /> : children}
    </button>
  )
}