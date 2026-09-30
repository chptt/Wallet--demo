// src/core/createWallet.ts
//
// Generates a brand-new Ethereum wallet from scratch and securely
// stores it. The flow is:
//
//   1. Generate a BIP-39 mnemonic (12 random words)
//   2. Derive an HD wallet using BIP-44 path  m/44'/60'/0'/0/0
//   3. Bundle the sensitive data into a "vault" object
//   4. Encrypt the vault with the user's password (AES-256-GCM via PBKDF2)
//   5. Store only the encrypted vault in chrome.storage.local
//
// At no point is the mnemonic or private key written to disk in plaintext.

import { HDNodeWallet, Mnemonic } from 'ethers'
import { encrypt, type EncryptedVault } from './encryption.ts'
import { saveVault } from './storage.ts'

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

// The plaintext wallet data we encrypt before storing.
// This is the secret — it must never leave this function unencrypted.
type WalletVault = {
  mnemonic: string   // 12-word BIP-39 seed phrase
  privateKey: string // hex private key for the first derived account
  address: string    // the public Ethereum address (0x...)
}

// What createWallet() returns to the caller (UI layer).
// The private key is NOT included — callers only get what they need.
export type NewWalletResult = {
  address: string  // public address, safe to display
  mnemonic: string // shown to user ONCE so they can write it down
}

// --------------------------------------------------------------------------
// BIP-44 derivation path explained:
//
//   m / 44' / 60' / 0' / 0 / index
//   │    │     │    │    │    └── account index (0 = first account)
//   │    │     │    │    └─────── external chain (0) vs change (1)
//   │    │     │    └──────────── account (hardened, always 0 here)
//   │    │     └───────────────── coin type 60 = Ethereum (per SLIP-44)
//   │    └─────────────────────── BIP-44 purpose
//   └──────────────────────────── master key
//
// The apostrophe (') means "hardened derivation" — child keys can't be
// reversed to find the parent, adding extra security.
// --------------------------------------------------------------------------
const DERIVATION_PATH = "m/44'/60'/0'/0/0"

// --------------------------------------------------------------------------
// Main function
// --------------------------------------------------------------------------

/**
 * Creates a new wallet, encrypts it, and saves it to chrome.storage.
 *
 * @param password  The user's chosen password. Used to derive the encryption key.
 * @returns         The public address and mnemonic (show mnemonic to user once, then discard from UI).
 */
export async function createWallet(password: string): Promise<NewWalletResult> {
  // --- Step 1: Generate a BIP-39 mnemonic ---
  //
  // ethers generates 128 bits of entropy → 12 words.
  // 128 bits means there are 2^128 possible mnemonics — brute force is
  // not feasible. (For reference: 2^128 ≈ 3.4 × 10^38)
  //
  // The mnemonic encodes the entropy in human-readable form so users
  // can back up their wallet by writing down 12 words.
  const mnemonic = Mnemonic.fromEntropy(
    // crypto.getRandomValues is the browser's CSPRNG (Cryptographically
    // Secure Pseudo-Random Number Generator). Always prefer this over
    // Math.random() for anything security-related.
    crypto.getRandomValues(new Uint8Array(16))
  )

  // --- Step 2: Derive an HD wallet from the mnemonic ---
  //
  // A mnemonic seeds a hierarchical deterministic (HD) wallet tree.
  // From one mnemonic you can derive billions of accounts deterministically.
  // We take the first Ethereum account (index 0) via the BIP-44 path above.
  const hdWallet: HDNodeWallet = HDNodeWallet.fromMnemonic(mnemonic, DERIVATION_PATH)

  // --- Step 3: Build the vault (plaintext, only exists in memory) ---
  const vault: WalletVault = {
    mnemonic: mnemonic.phrase,       // e.g. "word1 word2 ... word12"
    privateKey: hdWallet.privateKey, // 32-byte hex string, starts with 0x
    address: hdWallet.address,       // 20-byte hex string, starts with 0x
  }

  // --- Step 4: Encrypt the vault ---
  //
  // We serialize the vault to JSON, then encrypt the JSON string.
  // The result is an EncryptedVault with ciphertext, salt, and IV —
  // all safe to store because nothing is readable without the password.
  const encryptedVault: EncryptedVault = await encrypt(
    JSON.stringify(vault),
    password
  )

  // --- Step 5: Persist to chrome.storage.local ---
  //
  // chrome.storage.local is sandboxed to this extension — other
  // extensions and web pages cannot read it.
  await saveVault(encryptedVault)

  // Return just the public info. The mnemonic is included so the UI
  // can display it once for the user to write down.
  // The private key stays inside the vault (encrypted on disk).
  return {
    address: vault.address,
    mnemonic: vault.mnemonic,
  }
}
