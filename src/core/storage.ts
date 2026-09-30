// src/core/storage.ts
//
// A thin wrapper around chrome.storage.local.
//
// WHY A WRAPPER?
//   chrome.storage.local uses callbacks in MV3 but also returns Promises.
//   Centralising it here means the rest of the code uses clean async/await,
//   and if we ever switch storage backends (e.g. to IndexedDB for larger data)
//   we only change one file.
//
// SECURITY NOTE:
//   We only ever store the *encrypted* vault here. The plaintext mnemonic
//   and private key must never be passed to these functions.

import type { EncryptedVault } from './encryption.ts'

// The key under which the encrypted vault lives in chrome.storage.local.
const VAULT_KEY = 'encryptedVault'

/**
 * Saves the encrypted vault to chrome.storage.local.
 * Overwrites any previously saved vault (used on wallet creation and re-encryption).
 */
export async function saveVault(vault: EncryptedVault): Promise<void> {
  await chrome.storage.local.set({ [VAULT_KEY]: vault })
}

/**
 * Loads the encrypted vault from chrome.storage.local.
 * Returns null if no wallet has been created yet.
 */
export async function loadVault(): Promise<EncryptedVault | null> {
  const result = await chrome.storage.local.get(VAULT_KEY)
  // chrome.storage.get returns {} if the key doesn't exist
  return (result[VAULT_KEY] as EncryptedVault) ?? null
}

/**
 * Returns true if a wallet vault exists in storage.
 * Used by the UI to decide whether to show "Create Wallet" or "Unlock Wallet".
 */
export async function hasVault(): Promise<boolean> {
  const vault = await loadVault()
  return vault !== null
}

/**
 * Removes the vault from storage (factory reset / forget wallet).
 * This is irreversible unless the user has their mnemonic written down.
 */
export async function clearVault(): Promise<void> {
  await chrome.storage.local.remove(VAULT_KEY)
}
