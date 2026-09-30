import { QDNavbar } from '../components/navigation/QDNavbar'
import { ChameleonHero } from '../components/hero/ChameleonHero'
import { AssetStory } from '../components/assets/AssetStory'
import { ThresholdNetwork } from '../components/security/ThresholdNetwork'
import { SecurityLayers } from '../components/security/SecurityLayers'
import { WalletPreview } from '../components/wallet/WalletPreview'
import { TransactionApproval } from '../components/transaction/TransactionApproval'
import { WalletCTA } from '../components/sections/WalletCTA'
import { Footer } from '../components/sections/Footer'

// Story sequence: Chameleon/Wallet (hero) -> Your Assets -> Your Control /
// Distributed Protection (threshold) -> Security -> Wallet Experience ->
// Transaction Approval -> Final CTA.
export function LandingPage() {
  return (
    <>
      <QDNavbar />
      <main>
        <ChameleonHero />
        <AssetStory />
        <ThresholdNetwork />
        <SecurityLayers />
        <WalletPreview />
        <TransactionApproval />
        <WalletCTA />
      </main>
      <Footer />
    </>
  )
}
