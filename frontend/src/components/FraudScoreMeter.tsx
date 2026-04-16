export function FraudScoreMeter({ score }: { score: number }) {
  const color = score < 30 ? "#22C55E" : score < 70 ? "#F59E0B" : "#EF4444"
  const label = score < 30 ? "Clean" : score < 70 ? "Review" : "High Risk"
  const angle = (score / 100) * 180 - 90

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-16 overflow-hidden">
        <svg viewBox="0 0 100 50" className="w-full">
          <path d="M5,50 A45,45 0 0,1 95,50" fill="none" stroke="var(--color-bg-elevated)" strokeWidth="8" strokeLinecap="round" />
          <path
            d="M5,50 A45,45 0 0,1 95,50"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 141} 141`}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
          <line x1="50" y1="50" x2="50" y2="10" stroke="white" strokeWidth="2" strokeLinecap="round" transform={`rotate(${angle}, 50, 50)`} />
          <circle cx="50" cy="50" r="3" fill="white" />
        </svg>
      </div>
      <div className="text-center">
        <div className="font-display text-2xl font-bold" style={{ color }}>{score}</div>
        <div className="text-[11px] font-semibold uppercase tracking-widest" style={{ color }}>{label}</div>
      </div>
    </div>
  )
}