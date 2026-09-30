import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { brand } from '@config/brand'
import { Button } from '../ui/Button'
import mascot from '../../assets/brand/mascot-icon.svg'
import './ChameleonHero.css'

// Motion language transcribed from the reference clip:
// hold on the mascot -> push-in scale/rotate entrance -> headline letters
// tumble in staggered with individual rotation -> settle to resting state.
export function ChameleonHero() {
  const mascotRef = useRef<HTMLImageElement>(null)
  const headlineRef = useRef<HTMLHeadingElement>(null)
  const taglineRef = useRef<HTMLParagraphElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const letters = headlineRef.current
      ? Array.from(headlineRef.current.querySelectorAll<HTMLSpanElement>('.qd-hero__letter'))
      : []

    if (reduceMotion) {
      gsap.set([mascotRef.current, ...letters, taglineRef.current, ctaRef.current], {
        opacity: 1,
        clearProps: 'transform',
      })
      return
    }

    gsap.set(mascotRef.current, { opacity: 0, scale: 0.7, rotate: -6, transformOrigin: '50% 100%' })
    gsap.set(letters, { opacity: 0, y: 28, rotate: () => gsap.utils.random(-14, 14) })
    gsap.set([taglineRef.current, ctaRef.current], { opacity: 0, y: 16 })

    const tl = gsap.timeline({ delay: 0.2 })
    tl.to(mascotRef.current, { opacity: 1, scale: 1, rotate: 0, duration: 0.9, ease: 'power3.out' })
      .to(letters, { opacity: 1, y: 0, rotate: 0, duration: 0.55, ease: 'back.out(1.7)', stagger: 0.045 }, '-=0.35')
      .to(taglineRef.current, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '-=0.1')
      .to(ctaRef.current, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '-=0.25')

    return () => {
      tl.kill()
    }
  }, [])

  const headline = brand.name.split('')

  return (
    <section id="hero" className="qd-hero">
      <p className="qd-hero__eyebrow">Chameleon — the {brand.mascotName.toLowerCase()} who never loses its balance</p>

      <img ref={mascotRef} src={mascot} alt="Chameleon brand mark" className="qd-hero__mascot" />

      <h1 ref={headlineRef} className="qd-hero__headline" aria-label={brand.name}>
        {headline.map((char, i) => (
          <span key={i} className="qd-hero__letter" aria-hidden="true">
            {char}
          </span>
        ))}
      </h1>

      <p ref={taglineRef} className="qd-hero__tagline">{brand.tagline}</p>

      <div ref={ctaRef} className="qd-hero__actions">
        <Button variant="primary">Enter {brand.name}</Button>
        <Button variant="secondary">See how it works</Button>
      </div>
    </section>
  )
}
