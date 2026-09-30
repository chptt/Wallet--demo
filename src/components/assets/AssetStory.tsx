import { mockAccounts } from '@data/mockWallet'
import { useScrollReveal } from '../../animations/useScrollReveal'
import { SectionHeading } from '../ui/SectionHeading'
import { EthereumMark } from './EthereumMark'
import './AssetStory.css'

export function AssetStory() {
  const personal = mockAccounts[0]
  const sectionRef = useScrollReveal<HTMLElement>()

  return (
    <section id="assets" className="qd-asset-story" ref={sectionRef}>
      <SectionHeading
        label="Your Assets"
        title="Everything you hold, in one clear ledger."
        description="A sovereign balance view across your accounts — verified, legible, and never guessing what you own."
      />

      <div className="qd-asset-story__body">
        <div className="qd-asset-story__list" data-reveal>
          {personal.assets.map((asset) => (
            <div className="qd-asset-row" key={asset.symbol}>
              <span className="qd-asset-row__symbol">{asset.symbol}</span>
              <span className="qd-asset-row__name">{asset.name}</span>
              <span className="qd-asset-row__amount">{asset.amount}</span>
              <span className="qd-asset-row__value">{asset.fiatValue}</span>
              <span className="qd-asset-row__change">{asset.changePct}</span>
            </div>
          ))}
        </div>

        <div className="qd-asset-story__mark" data-reveal>
          <EthereumMark />
        </div>
      </div>
    </section>
  )
}
