import { useEffect } from 'react'
import { brand } from '@config/brand'
import { ScrollTrigger } from '../../animations/gsap'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import navIcon from '../../assets/brand/nav-icon.svg'
import './QDNavbar.css'

// The chameleon narrates the scroll: as the page moves through its story,
// the mascot's hue drifts with it — a camouflage cue rather than a fixed
// logo, tying the brand concept to the act of scrolling itself.
export function QDNavbar() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const trigger = ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        document.documentElement.style.setProperty('--chameleon-hue', `${self.progress * 300}deg`)
      },
    })

    return () => trigger.kill()
  }, [])

  return (
    <nav className="qd-navbar">
      <a href="#hero" className="qd-navbar__brand">
        <img src={navIcon} alt="" className="qd-navbar__icon" />
        <span>{brand.name}</span>
      </a>

      <ul className="qd-navbar__links">
        <li><a href="#assets">Assets</a></li>
        <li><a href="#control">Control</a></li>
        <li><a href="#security">Security</a></li>
        <li><a href="#wallet">Wallet</a></li>
      </ul>

      <div className="qd-navbar__actions">
        <Badge tone="approved">2/3 Quorum Ready</Badge>
        <Button variant="secondary">Launch {brand.name}</Button>
      </div>
    </nav>
  )
}
