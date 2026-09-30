import { useEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from './gsap'

type RevealOptions = {
  y?: number
  stagger?: number
}

// Applies a fade-up-on-scroll reveal to every descendant carrying
// [data-reveal] inside the returned container ref. Grouped via
// ScrollTrigger.batch so elements entering together animate together
// rather than firing one ScrollTrigger per element.
export function useScrollReveal<T extends HTMLElement>(options: RevealOptions = {}) {
  const containerRef = useRef<T>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const targets = Array.from(container.querySelectorAll<HTMLElement>('[data-reveal]'))
    if (targets.length === 0) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduceMotion) {
      gsap.set(targets, { opacity: 1, clearProps: 'transform' })
      return
    }

    gsap.set(targets, { opacity: 0, y: options.y ?? 32 })

    const triggers = ScrollTrigger.batch(targets, {
      start: 'top 85%',
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: 'power3.out',
          stagger: options.stagger ?? 0.08,
        }),
    })

    return () => {
      triggers.forEach((trigger) => trigger.kill())
    }
  }, [])

  return containerRef
}
