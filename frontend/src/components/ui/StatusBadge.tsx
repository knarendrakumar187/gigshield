const STATUS_STYLES: Record<string, string> = {
  APPROVED: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  PENDING: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  REJECTED: "bg-red-500/15 text-red-400 border border-red-500/30",
  MANUAL_REVIEW: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  ACTIVE: "bg-teal-500/15 text-teal-400 border border-teal-500/30",
  EXPIRED: "bg-gray-500/15 text-gray-400 border border-gray-500/30",
}

export type ClaimLikeStatus = keyof typeof STATUS_STYLES

export function StatusBadge({ status }: { status: ClaimLikeStatus }) {
  const styles = STATUS_STYLES[status] ?? STATUS_STYLES.PENDING
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase ${styles}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      {status.replace("_", " ")}
    </span>
  )
}