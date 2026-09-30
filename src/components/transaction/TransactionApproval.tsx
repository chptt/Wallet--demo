import { mockPendingTransaction, thresholdParticipants, thresholdRequired, thresholdTotal } from '@data/mockWallet'
import { useScrollReveal } from '../../animations/useScrollReveal'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { SectionHeading } from '../ui/SectionHeading'
import './TransactionApproval.css'

export function TransactionApproval() {
  const approvedCount = thresholdParticipants.filter((p) => p.status === 'approved').length
  const satisfied = approvedCount >= thresholdRequired
  const sectionRef = useScrollReveal<HTMLElement>()

  return (
    <section id="approval" className="qd-approval" ref={sectionRef}>
      <SectionHeading
        label="Transaction Approval"
        title="Every send asks the network, not just you."
        description="A mock walkthrough of what confirming a transaction looks like once quorum is required."
      />

      <div className="qd-approval__card" data-reveal>
        <div className="qd-approval__row">
          <span>Recipient</span>
          <span className="qd-approval__mono">{mockPendingTransaction.recipient}</span>
        </div>
        <div className="qd-approval__row">
          <span>Amount</span>
          <span className="qd-approval__mono">{mockPendingTransaction.amountEth} ({mockPendingTransaction.fiatValue})</span>
        </div>
        <div className="qd-approval__row">
          <span>Estimated fee</span>
          <span className="qd-approval__mono">{mockPendingTransaction.estimatedGas}</span>
        </div>

        <div className="qd-approval__quorum">
          {thresholdParticipants.map((p) => (
            <div className="qd-approval__participant" key={p.id}>
              <Badge tone={p.status === 'approved' ? 'approved' : 'waiting'}>
                {p.status === 'approved' ? 'Approved' : 'Waiting'}
              </Badge>
              <span>{p.label}</span>
            </div>
          ))}
        </div>

        <p className="qd-approval__status">
          {approvedCount} of {thresholdTotal} approved — threshold {satisfied ? 'satisfied' : 'not yet reached'}.
        </p>

        <div className="qd-approval__actions">
          <Button variant="secondary">Cancel</Button>
          <Button variant="primary" disabled={!satisfied}>Broadcast Transaction</Button>
        </div>
      </div>
    </section>
  )
}
