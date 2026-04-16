import type { ReactNode } from "react"

export type CardProps = {
  children: ReactNode
  glow?: boolean
  variant?: "default" | "danger" | "success"
  className?: string
  onClick?: () => void
}

export function Card({ children, glow = false, variant = "default", className = "", onClick }: CardProps) {
  return (
    <div
      role={onClick ? "button" : undefined}
      onClick={onClick}
      className={`
    relative rounded-[20px] border p-6 transition-all duration-250
    bg-[var(--color-bg-surface)] border-[var(--color-border)]
    ${glow ? "shadow-[var(--shadow-glow)] border-[var(--color-border-accent)]" : ""}
    ${variant === "danger" ? "border-red-500/30 bg-red-950/20" : ""}
    ${variant === "success" ? "border-emerald-500/30 bg-emerald-950/20" : ""}
    hover:border-[#2a3a50] hover:shadow-[var(--shadow-lifted)]
    ${className}
  `.trim()}
    >
      {children}
    </div>
  )
}