export function SkeletonCard() {
  return (
    <div className="rounded-[20px] bg-[var(--color-bg-surface)] border border-[var(--color-border)] p-6">
      <div className="animate-pulse space-y-3">
        <div className="h-3 bg-[var(--color-bg-elevated)] rounded-full w-24" />
        <div className="h-8 bg-[var(--color-bg-elevated)] rounded-lg w-40" />
        <div className="h-3 bg-[var(--color-bg-elevated)] rounded-full w-32" />
      </div>
    </div>
  )
}