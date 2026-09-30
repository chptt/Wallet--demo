import { useState } from 'react'
import type { MockAccount } from '@data/mockWallet'
import { Button } from '../ui/Button'
import './ReceiveFlow.css'

export function ReceiveFlow({ account }: { account: MockAccount }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(account.address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access denied or unavailable — nothing to recover from here.
    }
  }

  return (
    <div className="qd-receive-flow">
      <div className="qd-receive-flow__qr" aria-hidden="true">
        {Array.from({ length: 64 }).map((_, i) => (
          <span key={i} className={i % 7 === 0 || i % 5 === 0 ? 'is-filled' : ''} />
        ))}
      </div>

      <p className="qd-receive-flow__label">{account.name} address</p>
      <p className="qd-receive-flow__address">{account.address}</p>

      <Button variant="secondary" onClick={handleCopy}>
        {copied ? 'Copied' : 'Copy address'}
      </Button>

      <p className="qd-receive-flow__note">
        Only send assets on the same network to this address.
      </p>
    </div>
  )
}
