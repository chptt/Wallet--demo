// src/ui/App.tsx — screen router
//
// Normal popup flow: reads `screen` from WalletContext and renders the right screen.
// Approval flow: when Chrome opens the popup with #approval in the hash
//   (triggered by a dApp request), we render ApprovalScreen directly —
//   no context state needed, the params come from the URL.

import { useWallet } from '@state'
import { OnboardingScreen } from './screens/OnboardingScreen.tsx'
import { SeedPhraseScreen } from './screens/SeedPhraseScreen.tsx'
import { ImportScreen } from './screens/ImportScreen.tsx'
import { UnlockScreen } from './screens/UnlockScreen.tsx'
import { DashboardScreen } from './screens/DashboardScreen.tsx'
import { SendScreen } from './screens/SendScreen.tsx'
import { ApprovalScreen } from './screens/ApprovalScreen.tsx'

function App() {
  // If the popup was opened by the background for a dApp approval,
  // the URL hash starts with "#approval". Render that screen directly.
  if (window.location.hash.startsWith('#approval')) {
    return <ApprovalScreen />
  }

  const { screen } = useWallet()

  switch (screen) {
    case 'onboarding':  return <OnboardingScreen />
    case 'seed-phrase': return <SeedPhraseScreen />
    case 'import':      return <ImportScreen />
    case 'unlock':      return <UnlockScreen />
    case 'dashboard':   return <DashboardScreen />
    case 'send':        return <SendScreen />
  }
}

export default App
