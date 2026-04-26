import { useEffect, useRef, useState } from 'react'

/**
 * One-shot rAF number tween. Re-fires whenever `nonce` changes, even if
 * `from`/`to` are the same as a prior run. While the animation is in flight
 * `value` ramps from `from` to `to`; otherwise it stays at `to`. Easing
 * approximates the global `--adv-ease` cubic-bezier(0.32, 0.72, 0.24, 1).
 */
export function useValueTween(
  from: number,
  to: number,
  nonce: number,
  durationMs = 400,
): { value: number; active: boolean } {
  const [state, setState] = useState({ value: to, active: false })
  const lastNonce = useRef<number | null>(null)

  useEffect(() => {
    if (lastNonce.current === nonce) return
    lastNonce.current = nonce
    if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) {
      setState({ value: to, active: false })
      return
    }
    const start = performance.now()
    let raf = 0
    setState({ value: from, active: true })
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 4) // ease-out quart ≈ --adv-ease
      const next = from + (to - from) * eased
      if (t < 1) {
        setState({ value: next, active: true })
        raf = requestAnimationFrame(tick)
      } else {
        setState({ value: to, active: false })
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [from, to, nonce, durationMs])

  return state
}
