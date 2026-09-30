import { useState } from 'react'
import { thresholdParticipants, thresholdRequired, thresholdTotal } from '@data/mockWallet'
import { useScrollReveal } from '../../animations/useScrollReveal'
import { Badge } from '../ui/Badge'
import { SectionHeading } from '../ui/SectionHeading'
import './ThresholdNetwork.css'

// "Your Control" — distributed protection told plainly first. Technical
// terms (threshold schemes, quorum math) stay behind the toggle rather than
// leading the story, per the product's progressive-disclosure rule.
export function ThresholdNetwork() {
  const [showDetail, setShowDetail] = useState(false)
  const approvedCount = thresholdParticipants.filter((p) => p.status === 'approved').length
  const sectionRef = useScrollReveal<HTMLElement>()

  return (
    <section id="control" className="qd-threshold" ref={sectionRef}>
      <SectionHeading
        label="Your Control"
        title="No single point of failure. No single seed phrase to lose."
        description="Approval is shared across independent participants. Reaching quorum authorizes an action — no one holds the whole key alone."
      />

      <div className="qd-threshold__quorum" data-reveal>
        <span className="qd-threshold__quorum-count">{approvedCount} of {thresholdTotal}</span>
        <span className="qd-threshold__quorum-label">threshold reached</span>
      </div>

      <div className="qd-threshold__participants">
        {thresholdParticipants.map((p) => (
          <div className="qd-threshold-card" data-reveal key={p.id}>
            <Badge tone={p.status === 'approved' ? 'approved' : 'waiting'}>
              {p.status === 'approved' ? 'Approved' : 'Waiting'}
            </Badge>
            <h3 className="qd-threshold-card__label">{p.label}</h3>
            <p className="qd-threshold-card__description">{p.description}</p>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="qd-threshold__toggle"
        onClick={() => setShowDetail((v) => !v)}
        aria-expanded={showDetail}
      >
        {showDetail ? 'Hide technical detail' : 'Show technical detail'}
      </button>

      {showDetail && (
        <p className="qd-threshold__detail">
          Approval is coordinated using a threshold signing scheme: a minimum
          of {thresholdRequired} out of {thresholdTotal} participants must
          authorize an action before it proceeds. This is a design concept for
          this prototype — no cryptographic signing is implemented yet.
        </p>
      )}
    </section>
  )
}
