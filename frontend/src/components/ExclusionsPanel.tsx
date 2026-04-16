import { useCallback, useRef, useState } from 'react'
import { Card } from './ui/Card'

type ExRow = { id: string; name: string; description: string; category: string }

export function ExclusionsPanel({
  exclusions,
  checked,
  onChecked,
}: {
  exclusions: ExRow[]
  checked: boolean
  onChecked: (v: boolean) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrolledEnd, setScrolledEnd] = useState(false)

  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    if (near) setScrolledEnd(true)
  }, [])

  return (
    <Card variant="danger" className="!p-0 flex flex-col h-full overflow-hidden border-red-500/40">
      <div className="p-4 border-b border-red-500/20">
        <h3 className="text-h3 font-display text-red-300">What is NOT covered</h3>
        <p className="text-body-sm text-[var(--color-text-secondary)]">Read before you pay</p>
      </div>
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {exclusions.map((ex) => (
          <div key={ex.id} className="text-body-sm border-b border-[var(--color-border)] pb-2">
            <span className="text-red-400 font-mono text-xs">{ex.id}</span>
            <p className="font-semibold text-[var(--color-text-primary)]">{ex.name}</p>
            <p className="text-[var(--color-text-secondary)]">{ex.description}</p>
          </div>
        ))}
      </div>
      <label className="flex items-start gap-3 p-4 bg-red-950/30 cursor-pointer">
        <input
          type="checkbox"
          disabled={!scrolledEnd}
          checked={checked}
          onChange={(e) => onChecked(e.target.checked)}
          className="mt-1"
        />
        <span className="text-body-sm">
          I have read and understood all exclusions above {!scrolledEnd ? '(scroll to bottom to enable)' : ''}
        </span>
      </label>
    </Card>
  )
}
