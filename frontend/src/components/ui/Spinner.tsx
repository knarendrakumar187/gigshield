export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-[#0A0D14] border-t-transparent"
      style={{ width: size, height: size }}
      aria-hidden
    />
  )
}