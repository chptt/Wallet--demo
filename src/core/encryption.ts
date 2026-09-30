// src/core/encryption.ts
//
// Handles encrypting and decrypting the wallet vault using the
// Web Crypto API — built into every modern browser and into Chrome
// extensions. No third-party crypto library needed.
//
// ALGORITHM CHOICES EXPLAINED:
//
//   PBKDF2   — "Password-Based Key Derivation Function 2"
//              Turns the user's password (which might be weak) into a
//              strong 256-bit key by running a hash function 210,000
//              times. This makes brute-force attacks very expensive.
//              210,000 iterations is the OWASP-recommended minimum for
//              SHA-256 as of 2023.
//
//   AES-256-GCM — "Advanced Encryption Standard, Galois/Counter Mode"
//              A symmetric cipher: the same key encrypts and decrypts.
//              256-bit key = 2^256 possible keys (computationally unbreakable).
//              GCM mode adds an authentication tag, so we can detect
//              if the ciphertext was tampered with or the password is wrong.
//
//   Salt     — A random 16-byte value stored alongside the ciphertext.
//              Ensures two vaults encrypted with the same password still
//              produce different ciphertexts (defeats rainbow tables).
//
//   IV       — "Initialization Vector", a random 12-byte value for GCM.
//              Must be unique per encryption. Never reuse an IV+key pair.

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

// Everything we need to store in chrome.storage — no plaintext here.
export type EncryptedVault = {
  // The encrypted wallet data (Base64-encoded ciphertext + GCM auth tag)
  ciphertext: string
  // Random salt used during key derivation (Base64)
  salt: string
  // Random IV used during AES-GCM encryption (Base64)
  iv: string
  // Number of PBKDF2 iterations used — stored so we can increase it later
  iterations: number
}

// --------------------------------------------------------------------------
// Helpers: ArrayBuffer ↔ Base64
// We store binary data as Base64 strings in chrome.storage (JSON-safe).
// --------------------------------------------------------------------------

function bufferToBase64(buf: ArrayBuffer | Uint8Array<ArrayBuffer>): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  return btoa(String.fromCharCode(...bytes))
}

function base64ToBuffer(b64: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>
}

// --------------------------------------------------------------------------
// Key derivation
// --------------------------------------------------------------------------

const ITERATIONS = 210_000
const KEY_LENGTH_BITS = 256

/**
 * Derives an AES-256 CryptoKey from a user password and a salt.
 *
 * Steps:
 *  1. Import the password as a raw "PBKDF2" key (it's just bytes at this point).
 *  2. Use PBKDF2 to stretch it into a proper 256-bit AES key.
 *     The salt and iteration count are inputs — the same password + salt
 *     always produces the same key, which is how we decrypt later.
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  // Step 1: import the password string as a PBKDF2 base key
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false, // not extractable — we never want the raw bytes of this key
    ['deriveKey']
  )

  // Step 2: run PBKDF2 to produce the actual AES key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: KEY_LENGTH_BITS },
    false, // not extractable
    ['encrypt', 'decrypt']
  )
}

// --------------------------------------------------------------------------
// encrypt / decrypt
// --------------------------------------------------------------------------

/**
 * Encrypts a plaintext string with a password.
 *
 * Returns an EncryptedVault object safe to store in chrome.storage.
 * The vault contains ciphertext, salt, and IV — but NOT the password
 * or the derived key (those only exist in memory during this call).
 */
export async function encrypt(plaintext: string, password: string): Promise<EncryptedVault> {
  // Generate fresh random salt and IV for this encryption.
  // Crypto-random means an attacker can't predict them.
  const salt = crypto.getRandomValues(new Uint8Array(16)) as Uint8Array<ArrayBuffer>
  const iv = crypto.getRandomValues(new Uint8Array(12)) as Uint8Array<ArrayBuffer> // GCM standard: 12 bytes

  const key = await deriveKey(password, salt)

  // AES-GCM encrypt. The output is the ciphertext concatenated with the
  // 16-byte authentication tag (Web Crypto appends it automatically).
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    new TextEncoder().encode(plaintext)
  )

  return {
    ciphertext: bufferToBase64(cipherBuffer),
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
    iterations: ITERATIONS,
  }
}

/**
 * Decrypts an EncryptedVault with a password.
 *
 * Throws if the password is wrong or the data was tampered with —
 * AES-GCM's authentication tag will fail verification in that case.
 */
export async function decrypt(vault: EncryptedVault, password: string): Promise<string> {
  const salt = base64ToBuffer(vault.salt)
  const iv = base64ToBuffer(vault.iv)
  const ciphertext = base64ToBuffer(vault.ciphertext)

  // Re-derive the same key using the stored salt.
  // Same password + same salt = same key. That's the magic of PBKDF2.
  const key = await deriveKey(password, salt)

  // AES-GCM decrypt. Will throw a DOMException ("OperationError") if:
  //   - the password was wrong (wrong key → auth tag mismatch)
  //   - the ciphertext was modified
  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    ciphertext
  )

  return new TextDecoder().decode(plaintextBuffer)
}
