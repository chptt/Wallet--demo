// src/core/unlockWallet.ts
//
// Unlocks the wallet by:
//   1. Loading the encrypted vault from chrome.storage.local
//   2. Decrypting it with the user's password
//   3. Re-constructing an ethers.Wallet from the private key
//      (kept in memory only — never re-stored)
//
// IMPORTANT: The returned Wallet object lives in JS heap memory.
// In a Chrome MV3 extension the background service worker can be
// suspended at any time, wiping memory. The UI should re-unlock
// when the background restarts rather than assuming the wallet
// is always in memory.

import { Wallet } from 'ethers'
import { decrypt } from './encryption.ts'
import { loadVault } from './storage.ts'

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

// The shape of the decrypted JSON stored inside the vault.
// Must match the WalletVault type in createWallet.ts.
type WalletVault = {
  mnemonic: string
  privateKey: string
  address: string
}

// What unlockWallet() returns to the caller.
export type UnlockedWallet = {
  wallet: Wallet  // ethers.Wallet — can sign transactions, messages, etc.
  address: string // the public address, convenient for display
}

// --------------------------------------------------------------------------
// Errors
// --------------------------------------------------------------------------

// Custom error so callers can tell "wrong password" apart from
// "no wallet exists" or "unexpected crash".
export class WrongPasswordError extends Error {
  constructor() {
    super('Wrong password or corrupted vault.')
    this.name = 'WrongPasswordError'
  }
}

export class NoWalletError extends Error {
  constructor() {
    super('No wallet found. Please create one first.')
    this.name = 'NoWalletError'
  }
}

// --------------------------------------------------------------------------
// Main function
// --------------------------------------------------------------------------

/**
 * Unlocks the wallet using the user's password.
 *
 * @param password  The password chosen during wallet creation.
 * @returns         An UnlockedWallet with a live ethers.Wallet in memory.
 * @throws          NoWalletError if storage is empty.
 * @throws          WrongPasswordError if decryption fails.
 */
export async function unlockWallet(password: string): Promise<UnlockedWallet> {
  // --- Step 1: Load the encrypted vault from storage ---
  const encryptedVault = await loadVault()

  if (encryptedVault === null) {
    throw new NoWalletError()
  }

  // --- Step 2: Decrypt the vault ---
  //
  // decrypt() will throw a DOMException if the password is wrong.
  // AES-GCM's authentication tag guarantees that a bad password
  // produces a detectable failure rather than silently giving us
  // garbage data. We catch it and re-throw a friendly error.
  let vault: WalletVault
  try {
    const plaintext = await decrypt(encryptedVault, password)
    vault = JSON.parse(plaintext) as WalletVault
  } catch {
    // DOMException "OperationError" = wrong key = wrong password.
    // We don't distinguish from other errors here to avoid
    // leaking information about why decryption failed.
    throw new WrongPasswordError()
  }

  // --- Step 3: Reconstruct the ethers Wallet from the private key ---
  //
  // We use the private key (not the mnemonic) because:
  //   - It's cheaper to construct a Wallet from a private key.
  //   - We only need signing capability in memory, not the full HD tree.
  //
  // The Wallet is NOT connected to a provider here. To read balances or
  // broadcast transactions, connect it later:
  //   wallet.connect(new ethers.JsonRpcProvider(rpcUrl))
  const wallet = new Wallet(vault.privateKey)

  // Sanity-check: the address derived from the private key must match
  // what was stored. If they differ, the vault is corrupt.
  if (wallet.address.toLowerCase() !== vault.address.toLowerCase()) {
    throw new Error('Address mismatch — vault may be corrupted.')
  }

  // The mnemonic has served its purpose (decryption and reconstruction).
  // We don't include it in the return value — the in-memory Wallet is
  // all the caller needs for signing.
  return {
    wallet,
    address: wallet.address,
  }
}
