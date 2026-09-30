import { useEffect, useRef } from 'react'
import { gsap } from '../../animations/gsap'
import './EthereumMark.css'

// The "Ethereum/3D asset" beat from the brief, done the lightweight way:
// a flat SVG facet mark with a CSS 3D tilt driven by pointer position and a
// slow idle spin — no WebGL, since nothing here needs real 3D interaction.
export function EthereumMark() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const idleTween = useRef<gsap.core.Tween | null>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return

    idleTween.current = gsap.to(wrap, {
      rotateY: 360,
      duration: 14,
      repeat: -1,
      ease: 'none',
    })

    const handlePointerMove = (event: PointerEvent) => {
      const rect = wrap.getBoundingClientRect()
      const relX = (event.clientX - rect.left) / rect.width - 0.5
      const relY = (event.clientY - rect.top) / rect.height - 0.5
      gsap.to(wrap, { rotateX: relY * -20, rotateZ: relX * 8, duration: 0.4, ease: 'power2.out' })
    }

    const handlePointerLeave = () => {
      gsap.to(wrap, { rotateX: 0, rotateZ: 0, duration: 0.6, ease: 'power2.out' })
    }

    wrap.addEventListener('pointermove', handlePointerMove)
    wrap.addEventListener('pointerleave', handlePointerLeave)

    return () => {
      idleTween.current?.kill()
      wrap.removeEventListener('pointermove', handlePointerMove)
      wrap.removeEventListener('pointerleave', handlePointerLeave)
    }
  }, [])

  return (
    <div className="qd-eth-mark__stage">
      <div ref={wrapRef} className="qd-eth-mark__wrap">
        <svg viewBox="0 0 100 120" className="qd-eth-mark__svg" aria-hidden="true">
          <polygon points="50,4 90,58 50,80 10,58" fill="var(--color-forest)" />
          <polygon points="50,4 50,80 10,58" fill="var(--color-forest-deep)" />
          <polygon points="50,32 90,58 50,68 10,58" fill="var(--color-cyan)" opacity="0.9" />
          <polygon points="50,32 50,68 10,58" fill="var(--color-purple)" opacity="0.85" />
          <polygon points="50,84 90,62 50,116 10,62" fill="var(--color-forest)" />
          <polygon points="50,84 50,116 10,62" fill="var(--color-forest-deep)" />
        </svg>
      </div>
      <span className="qd-eth-mark__label">ETH</span>
    </div>
  )
}
