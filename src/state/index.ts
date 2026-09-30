// src/state/index.ts
//
// Public API for the state layer.
// Components import from '@state' to get the context and hook.

export { WalletProvider, useWallet } from './WalletContext.tsx'
export type { Screen } from './WalletContext.tsx'
export { NETWORKS, DEFAULT_NETWORK } from './networks.ts'
export type { Network } from './networks.ts'
