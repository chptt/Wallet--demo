// src/main.tsx — React entry point
//
// Mounts the app into the popup's #root div.
// WalletProvider wraps everything so any component can call useWallet().

import React from 'react'
import ReactDOM from 'react-dom/client'
import { WalletProvider } from '@state'
import { App } from '@ui'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WalletProvider>
      <App />
    </WalletProvider>
  </React.StrictMode>
)
