/// <reference types="vite/client" />

declare module 'canvas-confetti' {
  const confetti: (opts?: Record<string, unknown>) => void
  export default confetti
}