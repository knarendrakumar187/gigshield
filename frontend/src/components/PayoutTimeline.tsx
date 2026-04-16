const STEPS = ["Triggered", "Exclusion Check", "Fraud Analysis", "Approved", "Paid"] as const

export type TimelineClaim = {
  status: "PENDING" | "APPROVED" | "REJECTED" | "MANUAL_REVIEW"
  approved_amount?: string | number
  payout?: { completed_at?: string | null } | null
  worker?: { upi_id?: string }
}

function getActiveStep(claim: TimelineClaim): number {
  if (claim.payout?.completed_at) return 4
  if (claim.status === "APPROVED") return 3
  if (claim.status === "MANUAL_REVIEW") return 2
  if (claim.status === "REJECTED") return 2
  return 2
}

function getStepDescription(step: string, _claim: TimelineClaim): string {
  const d: Record<string, string> = {
    Triggered: "Disruption detected for your zone.",
    "Exclusion Check": "Verifying policy exclusions.",
    "Fraud Analysis": "Running automated fraud checks.",
    Approved: "Claim approved - processing payout.",
    Paid: "Funds sent to your UPI.",
  }
  return d[step] ?? ""
}

export function ClaimTimeline({ claim }: { claim: TimelineClaim }) {
  const activeStep = getActiveStep(claim)
  const rupee = "\u20B9"
  return (
    <div className="relative py-2">
      {STEPS.map((step, i) => (
        <div key={step} className="flex gap-4 pb-6 last:pb-0">
          <div className="flex flex-col items-center">
            <div
              className={`
              w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500
              ${i < activeStep ? "bg-[var(--color-accent)] text-[#0A0D14]" : ""}
              ${i === activeStep ? "bg-[var(--color-accent-dim)] border-2 border-[var(--color-accent)] text-[var(--color-accent)] animate-pulse" : ""}
              ${i > activeStep ? "bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]" : ""}
            `.trim()}
            >
              {i < activeStep ? "\u2713" : i + 1}
            </div>
            {i < STEPS.length - 1 ? (
              <div className={`w-0.5 flex-1 mt-1 min-h-[24px] transition-colors duration-500 ${i < activeStep ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"}`} />
            ) : null}
          </div>
          <div className="flex-1 pt-1 pb-2">
            <p className={`font-body text-sm font-semibold ${i <= activeStep ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"}`}>{step}</p>
            {i === activeStep ? <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{getStepDescription(step, claim)}</p> : null}
            {i < activeStep && step === "Paid" ? (
              <p className="font-mono text-sm text-[var(--color-accent)] mt-0.5">
                {rupee}
                {claim.approved_amount} to {claim.worker?.upi_id}
              </p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}