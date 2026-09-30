import { brand } from '@config/brand'
import { useScrollReveal } from '../../animations/useScrollReveal'
import { Button } from '../ui/Button'
import './WalletCTA.css'

export function WalletCTA() {
  const sectionRef = useScrollReveal<HTMLElement>()

  return (
    <section className="qd-cta" ref={sectionRef}>
      <h2 className="qd-cta__title" data-reveal>One wallet.<br />Distributed protection.</h2>
      <p className="qd-cta__subtitle" data-reveal>A prototype exploring what shared, threshold-based control could feel like for everyday custody.</p>
      <div data-reveal>
        <Button variant="primary">Enter {brand.name}</Button>
      </div>
    </section>
  )
}
