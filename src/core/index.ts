// src/core/index.ts
//
// Public API for the wallet core.
// Import from '@core' to get everything; import from '@core/createWallet'
// etc. to get individual modules if you want to keep bundle sizes small.

export { createWallet } from './createWallet.ts'
export type { NewWalletResult } from './createWallet.ts'

export { unlockWallet, WrongPasswordError, NoWalletError } from './unlockWallet.ts'
export type { UnlockedWallet } from './unlockWallet.ts'

export { saveVault, loadVault, hasVault, clearVault } from './storage.ts'

export { sendTransaction, estimateGasFee, validateSendInputs, SendError } from './sendTransaction.ts'
export type { SendParams, GasEstimate, TxResult } from './sendTransaction.ts'

// encryption.ts is intentionally not re-exported here.
// It's an internal implementation detail — callers shouldn't need to
// call encrypt/decrypt directly.
