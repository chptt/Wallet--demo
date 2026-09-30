import { useState } from 'react'
import type { MockAccount } from '@data/mockWallet'
import { thresholdParticipants, thresholdRequired, thresholdTotal } from '@data/mockWallet'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import './SendFlow.css'

type Step = 'form' | 'review' | 'success'

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{8,40}$/

function parseEthBalance(account: MockAccount): number {
  const eth = account.assets.find((a) => a.symbol === 'ETH')
  if (!eth) return 0
  return parseFloat(eth.amount.replace(/[^0-9.]/g, ''))
}

export function SendFlow({ account }: { account: MockAccount }) {
  const [step, setStep] = useState<Step>('form')
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [errors, setErrors] = useState<{ recipient?: string; amount?: string }>({})

  const approvedCount = thresholdParticipants.filter((p) => p.status === 'approved').length
  const satisfied = approvedCount >= thresholdRequired
  const balance = parseEthBalance(account)
  const parsedAmount = parseFloat(amount)

  const handleReview = () => {
    const nextErrors: typeof errors = {}
    if (!ADDRESS_PATTERN.test(recipient.trim())) {
      nextErrors.recipient = 'Enter a valid-looking address (0x…).'
    }
    if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      nextErrors.amount = 'Enter an amount greater than zero.'
    } else if (parsedAmount > balance) {
      nextErrors.amount = `Amount exceeds available balance (${balance.toFixed(4)} ETH).`
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length === 0) setStep('review')
  }

  if (step === 'success') {
    const mockTxHash = `0x${Math.random().toString(16).slice(2, 10)}…${Math.random().toString(16).slice(2, 6)}`
    return (
      <div className="qd-send-flow__success">
        <p className="qd-send-flow__success-badge">Transaction broadcast</p>
        <p className="qd-send-flow__success-detail">
          {parsedAmount.toFixed(4)} ETH sent to {recipient.slice(0, 6)}…{recipient.slice(-4)}
        </p>
        <p className="qd-send-flow__hash">Mock tx: {mockTxHash}</p>
        <p className="qd-send-flow__note">This is a simulated broadcast — no real transaction was sent.</p>
      </div>
    )
  }

  if (step === 'review') {
    return (
      <div className="qd-send-flow">
        <div className="qd-send-flow__row">
          <span>Recipient</span>
          <span className="qd-send-flow__mono">{recipient}</span>
        </div>
        <div className="qd-send-flow__row">
          <span>Amount</span>
          <span className="qd-send-flow__mono">{parsedAmount.toFixed(4)} ETH</span>
        </div>
        <div className="qd-send-flow__row">
          <span>Estimated fee</span>
          <span className="qd-send-flow__mono">$0.84</span>
        </div>

        <div className="qd-send-flow__quorum">
          {thresholdParticipants.map((p) => (
            <div className="qd-send-flow__participant" key={p.id}>
              <Badge tone={p.status === 'approved' ? 'approved' : 'waiting'}>
                {p.status === 'approved' ? 'Approved' : 'Waiting'}
              </Badge>
              <span>{p.label}</span>
            </div>
          ))}
        </div>

        <p className="qd-send-flow__status">
          {approvedCount} of {thresholdTotal} approved — threshold {satisfied ? 'satisfied' : 'not yet reached'}.
        </p>

        <div className="qd-send-flow__actions">
          <Button variant="secondary" onClick={() => setStep('form')}>Back</Button>
          <Button variant="primary" disabled={!satisfied} onClick={() => setStep('success')}>
            Broadcast
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="qd-send-flow">
      <Field
        label="Recipient address"
        placeholder="0x…"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        error={errors.recipient}
      />
      <Field
        label={`Amount (available: ${balance.toFixed(4)} ETH)`}
        placeholder="0.00"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        error={errors.amount}
      />
      <div className="qd-send-flow__actions">
        <Button variant="primary" onClick={handleReview}>Review</Button>
      </div>
    </div>
  )
}
