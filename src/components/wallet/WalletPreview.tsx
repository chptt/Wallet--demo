import { useState } from 'react'
import { mockAccounts, mockActivity } from '@data/mockWallet'
import { useScrollReveal } from '../../animations/useScrollReveal'
import { Button } from '../ui/Button'
import { SectionHeading } from '../ui/SectionHeading'
import { ReceiveFlow } from './ReceiveFlow'
import { SendFlow } from './SendFlow'
import { SwapFlow } from './SwapFlow'
import { WalletModal } from './WalletModal'
import './WalletPreview.css'

type ActiveFlow = 'send' | 'receive' | 'swap' | null

export function WalletPreview() {
  const [activeAccountId, setActiveAccountId] = useState(mockAccounts[0].id)
  const [activeFlow, setActiveFlow] = useState<ActiveFlow>(null)
  const activeAccount = mockAccounts.find((a) => a.id === activeAccountId)!
  const sectionRef = useScrollReveal<HTMLElement>()

  return (
    <section id="wallet" className="qd-wallet" ref={sectionRef}>
      <SectionHeading
        label="Wallet Experience"
        title="Familiar to use. Distinct to look at."
        description="Accounts, assets, and activity — organized the way you'd expect from any wallet, with none of the borrowed visual language."
      />

      <div className="qd-wallet__panel" data-reveal>
        <div className="qd-wallet__selector">
          {mockAccounts.map((account) => (
            <button
              key={account.id}
              type="button"
              className={`qd-wallet__account ${account.id === activeAccountId ? 'is-active' : ''}`}
              onClick={() => setActiveAccountId(account.id)}
            >
              {account.name}
            </button>
          ))}
        </div>

        <div className="qd-wallet__body">
          <div className="qd-wallet__assets">
            {activeAccount.assets.map((asset) => (
              <div className="qd-wallet-asset" key={asset.symbol}>
                <span className="qd-wallet-asset__symbol">{asset.symbol}</span>
                <div className="qd-wallet-asset__meta">
                  <span className="qd-wallet-asset__amount">{asset.amount}</span>
                  <span className="qd-wallet-asset__value">{asset.fiatValue}</span>
                </div>
              </div>
            ))}

            <div className="qd-wallet__actions">
              <Button variant="primary" onClick={() => setActiveFlow('send')}>Send</Button>
              <Button variant="secondary" onClick={() => setActiveFlow('receive')}>Receive</Button>
              <Button variant="secondary" onClick={() => setActiveFlow('swap')}>Swap</Button>
            </div>
          </div>

          <div className="qd-wallet__activity">
            <h3 className="qd-wallet__activity-title">Activity</h3>
            {mockActivity.map((event) => (
              <div className="qd-wallet-activity-row" key={event.id}>
                <span>{event.summary}</span>
                <span className="qd-wallet-activity-row__amount">{event.amount}</span>
                <span className="qd-wallet-activity-row__time">{event.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {activeFlow === 'send' && (
        <WalletModal title="Send" onClose={() => setActiveFlow(null)}>
          <SendFlow account={activeAccount} />
        </WalletModal>
      )}
      {activeFlow === 'receive' && (
        <WalletModal title="Receive" onClose={() => setActiveFlow(null)}>
          <ReceiveFlow account={activeAccount} />
        </WalletModal>
      )}
      {activeFlow === 'swap' && (
        <WalletModal title="Swap" onClose={() => setActiveFlow(null)}>
          <SwapFlow account={activeAccount} />
        </WalletModal>
      )}
    </section>
  )
}
