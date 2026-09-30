import { useScrollReveal } from '../../animations/useScrollReveal'
import { SectionHeading } from '../ui/SectionHeading'
import './SecurityLayers.css'

type Pillar = {
  index: string
  title: string
  description: string
  badge: string
}

// Copy deliberately avoids implying implemented cryptography — these are
// design concepts for the prototype, worded as concepts rather than claims.
const pillars: Pillar[] = [
  {
    index: '01',
    title: 'Session Protection',
    description: 'Sessions are designed to stay short-lived and sandboxed, so an open tab is never a standing liability.',
    badge: 'Concept · Ephemeral sessions',
  },
  {
    index: '02',
    title: 'Threshold Authorization',
    description: 'Actions are designed to require agreement from multiple independent participants before they proceed.',
    badge: 'Concept · 2 of 3 minimum',
  },
  {
    index: '03',
    title: 'Deterministic Derivation',
    description: 'Multiple accounts are organized from a single structured hierarchy, so nothing is scattered or duplicated.',
    badge: 'Concept · Structured accounts',
  },
  {
    index: '04',
    title: 'Post-Quantum Readiness',
    description: 'The security model is being designed with future quantum-resistant cryptography in mind, for when standards mature.',
    badge: 'Design goal · Not yet implemented',
  },
]

export function SecurityLayers() {
  const sectionRef = useScrollReveal<HTMLElement>()

  return (
    <section id="security" className="qd-security" ref={sectionRef}>
      <SectionHeading
        label="Security"
        title="Simple on the surface. Deliberate underneath."
        description="These are the security concepts guiding this prototype's design. This is a frontend product concept — no cryptographic signing runs in this build yet."
      />

      <div className="qd-security__grid">
        {pillars.map((pillar) => (
          <div className="qd-security-pillar" data-reveal key={pillar.index}>
            <span className="qd-security-pillar__index">{pillar.index}</span>
            <h3 className="qd-security-pillar__title">{pillar.title}</h3>
            <p className="qd-security-pillar__description">{pillar.description}</p>
            <span className="qd-security-pillar__badge">{pillar.badge}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
