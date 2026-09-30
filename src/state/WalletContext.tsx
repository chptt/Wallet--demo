// src/state/WalletContext.tsx
//
// Holds all wallet state and exposes actions to the UI layer.
// Components never import from @core directly — they go through this context.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { JsonRpcProvider, formatEther, HDNodeWallet, type Wallet } from 'ethers'
import {
  hasVault,
  unlockWallet,
  WrongPasswordError,
  NoWalletError,
  createWallet as coreCreateWallet,
  saveVault,
  estimateGasFee,
  sendTransaction as coreSendTx,
  validateSendInputs,
} from '@core'
import type { GasEstimate, TxResult } from '@core'
import { encrypt } from '@core/encryption.ts'
import { DEFAULT_NETWORK, NETWORKS, type Network } from './networks.ts'

// --------------------------------------------------------------------------
// Screen navigation
// --------------------------------------------------------------------------
//
// Screen flow:
//   'onboarding'  — first launch, no wallet exists yet
//   'seed-phrase' — shown after creating a wallet so user writes it down
//   'import'      — enter existing seed phrase to restore a wallet
//   'unlock'      — wallet exists but is locked
//   'dashboard'   — wallet is unlocked and ready to use
//   'send'        — send ETH flow

export type Screen = 'onboarding' | 'seed-phrase' | 'import' | 'unlock' | 'dashboard' | 'send'

// --------------------------------------------------------------------------
// State + Actions shapes
// --------------------------------------------------------------------------

type WalletState = {
  screen: Screen
  isLocked: boolean
  hasWallet: boolean
  address: string | null
  network: Network
  availableNetworks: Network[]
  balance: string | null
  isFetchingBalance: boolean
  error: string | null
  pendingMnemonic: string | null
  // The live ethers.Wallet in memory — null when locked.
  // Exposed so SendScreen can pass it to core functions for signing.
  activeWallet: Wallet | null
}

type WalletActions = {
  navigate: (screen: Screen) => void
  createWallet: (password: string) => Promise<void>
  confirmSeedPhrase: () => void
  importWallet: (mnemonic: string, password: string) => Promise<void>
  unlock: (password: string) => Promise<void>
  lock: () => void
  switchNetwork: (chainId: number) => void
  refreshBalance: () => Promise<void>
  /** Validate inputs + call network for a gas estimate. */
  estimateGas: (to: string, amountEth: string) => Promise<GasEstimate>
  /** Sign, broadcast, and wait for confirmation. */
  sendTx: (to: string, amountEth: string, gasEstimate: GasEstimate) => Promise<TxResult>
}

type WalletContextValue = WalletState & WalletActions

const WalletContext = createContext<WalletContextValue | null>(null)

// --------------------------------------------------------------------------
// Provider
// --------------------------------------------------------------------------

export function WalletProvider({ children }: { children: ReactNode }) {
  const [currentScreen, setCurrentScreen] = useState<Screen>('onboarding')
  const [isLocked, setIsLocked] = useState(true)
  const [hasWalletState, setHasWalletState] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const [network, setNetwork] = useState<Network>(DEFAULT_NETWORK)
  const [balance, setBalance] = useState<string | null>(null)
  const [isFetchingBalance, setIsFetchingBalance] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingMnemonic, setPendingMnemonic] = useState<string | null>(null)
  // The live Wallet — populated on unlock, cleared on lock.
  const [activeWallet, setActiveWallet] = useState<Wallet | null>(null)

  // On mount: check whether a vault already exists in storage.
  // No vault → onboarding. Has vault → unlock screen.
  useEffect(() => {
    hasVault().then((exists) => {
      setHasWalletState(exists)
      if (exists) setCurrentScreen('unlock')
    }).catch(() => {})
  }, [])

  // ── Balance ───────────────────────────────────────────────────────────────

  const refreshBalance = useCallback(async () => {
    if (!address) return
    setIsFetchingBalance(true)
    setError(null)
    try {
      // JsonRpcProvider sends eth_getBalance to the node over HTTP.
      const provider = new JsonRpcProvider(network.rpcUrl)
      const balanceWei = await provider.getBalance(address)
      // formatEther: wei (BigInt) → ETH decimal string, e.g. "1.23"
      setBalance(formatEther(balanceWei))
    } catch {
      setError('Failed to fetch balance. Check your network connection.')
      setBalance(null)
    } finally {
      setIsFetchingBalance(false)
    }
  }, [address, network])

  // Auto-refresh whenever address or network changes.
  useEffect(() => {
    if (address) refreshBalance()
  }, [address, network, refreshBalance])

  // ── Navigation ────────────────────────────────────────────────────────────

  const navigate = useCallback((s: Screen) => {
    setError(null)
    setCurrentScreen(s)
  }, [])

  // ── Wallet creation ───────────────────────────────────────────────────────

  const createWallet = useCallback(async (password: string) => {
    setError(null)
    try {
      // Generates entropy → 12-word mnemonic → HD wallet → encrypted vault
      // → saves to chrome.storage
      const result = await coreCreateWallet(password)
      setPendingMnemonic(result.mnemonic)
      setAddress(result.address)
      setHasWalletState(true)
      setCurrentScreen('seed-phrase')
    } catch {
      setError('Failed to create wallet. Please try again.')
    }
  }, [])

  const confirmSeedPhrase = useCallback(() => {
    // Mnemonic has been shown — discard from memory, go to unlock.
    setPendingMnemonic(null)
    setAddress(null)
    setCurrentScreen('unlock')
  }, [])

  // ── Import ────────────────────────────────────────────────────────────────

  const importWallet = useCallback(async (mnemonic: string, password: string) => {
    setError(null)
    try {
      // fromPhrase validates the BIP-39 word list and throws if invalid.
      const hdWallet = HDNodeWallet.fromPhrase(mnemonic.trim(), undefined, "m/44'/60'/0'/0/0")
      const vault = {
        mnemonic: mnemonic.trim(),
        privateKey: hdWallet.privateKey,
        address: hdWallet.address,
      }
      const encryptedVault = await encrypt(JSON.stringify(vault), password)
      await saveVault(encryptedVault)
      setHasWalletState(true)
      setCurrentScreen('unlock')
    } catch {
      setError('Invalid seed phrase. Please check and try again.')
    }
  }, [])

  // ── Unlock / lock ─────────────────────────────────────────────────────────

  const unlock = useCallback(async (password: string) => {
    setError(null)
    try {
      const result = await unlockWallet(password)
      setActiveWallet(result.wallet)
      setAddress(result.address)
      setIsLocked(false)
      setHasWalletState(true)
      setCurrentScreen('dashboard')
      // Write the current network to storage so the background worker has it.
      chrome.storage.local.set({ activeNetwork: { rpcUrl: network.rpcUrl, chainId: network.chainId, name: network.name } })
    } catch (err) {
      if (err instanceof WrongPasswordError) {
        setError('Incorrect password. Please try again.')
      } else if (err instanceof NoWalletError) {
        setError('No wallet found. Please create one first.')
      } else {
        setError('Failed to unlock wallet.')
      }
    }
  }, [])

  const lock = useCallback(() => {
    setActiveWallet(null)
    setAddress(null)
    setBalance(null)
    setIsLocked(true)
    setError(null)
    setCurrentScreen('unlock')
  }, [])

  // ── Network ───────────────────────────────────────────────────────────────

  const switchNetwork = useCallback((chainId: number) => {
    const found = NETWORKS.find((n) => n.chainId === chainId)
    if (!found) {
      setError(`Unknown network chainId: ${chainId}`)
      return
    }
    setBalance(null)
    setNetwork(found)
    // Persist the selected network to chrome.storage.local so the background
    // service worker can read the active RPC URL when signing dApp transactions.
    chrome.storage.local.set({ activeNetwork: { rpcUrl: found.rpcUrl, chainId: found.chainId, name: found.name } })
  }, [])

  // ── Send: gas estimation ──────────────────────────────────────────────────

  /**
   * Validates the inputs then asks the network for a gas estimate.
   * The UI calls this when the user clicks "Estimate Fee" in SendScreen.
   * Throws SendError (from @core) on invalid inputs or network failure.
   */
  const estimateGas = useCallback(async (to: string, amountEth: string): Promise<GasEstimate> => {
    if (!activeWallet) throw new Error('Wallet is locked.')

    // validateSendInputs throws SendError with a typed code if anything is wrong.
    // We pass the current balance so it can check sufficiency.
    validateSendInputs(to, amountEth, balance)

    return estimateGasFee(
      { to, amountEth, rpcUrl: network.rpcUrl, chainId: network.chainId },
      activeWallet
    )
  }, [activeWallet, balance, network])

  // ── Send: broadcast ───────────────────────────────────────────────────────

  /**
   * Signs and broadcasts the transaction, waits for 1 confirmation.
   * The UI calls this after the user reviews the gas estimate and confirms.
   * After success, refreshes the balance to reflect the spent ETH.
   */
  const sendTx = useCallback(async (
    to: string,
    amountEth: string,
    gasEstimate: GasEstimate
  ): Promise<TxResult> => {
    if (!activeWallet) throw new Error('Wallet is locked.')

    const result = await coreSendTx(
      { to, amountEth, rpcUrl: network.rpcUrl, chainId: network.chainId },
      activeWallet,
      gasEstimate
    )

    // Refresh balance after send so the dashboard shows the updated amount.
    await refreshBalance()

    return result
  }, [activeWallet, network, refreshBalance])

  // ── Context value ─────────────────────────────────────────────────────────

  const value: WalletContextValue = {
    screen: currentScreen,
    isLocked,
    hasWallet: hasWalletState,
    address,
    network,
    availableNetworks: NETWORKS,
    balance,
    isFetchingBalance,
    error,
    pendingMnemonic,
    activeWallet,
    navigate,
    createWallet,
    confirmSeedPhrase,
    importWallet,
    unlock,
    lock,
    switchNetwork,
    refreshBalance,
    estimateGas,
    sendTx,
  }

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  )
}

// --------------------------------------------------------------------------
// Hook
// --------------------------------------------------------------------------

/**
 * Call this inside any component to read wallet state or trigger actions.
 * Must be used inside <WalletProvider>.
 */
export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext)
  if (ctx === null) {
    throw new Error('useWallet() must be called inside a <WalletProvider>.')
  }
  return ctx
}
