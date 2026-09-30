// src/content/injectProvider.ts
//
// This script is injected into the PAGE's main JavaScript world.
// It creates window.ethereum — the object dApps call to interact
// with a wallet (just like MetaMask does).
//
// EXECUTION CONTEXT:
//   Page world → can read/write window.ethereum
//   Cannot use chrome.* APIs directly (those are only available in
//   the extension's isolated world).
//
// COMMUNICATION PATH:
//   window.ethereum.request()
//     → postMessage to window          (page world → isolated world)
//     → contentScript picks it up
//     → chrome.runtime.sendMessage     (isolated world → background)
//     → background does the work
//     → chrome.runtime.sendMessage response
//     → contentScript postMessage reply
//     → Promise resolves here

// ── Message protocol ──────────────────────────────────────────────────────
//
// Every message has a unique requestId so replies can be matched to
// the correct pending Promise even if several requests are in-flight.
//
// Page → content script:
//   { source: 'crypto-wallet-page', requestId, method, params }
//
// Content script → page:
//   { source: 'crypto-wallet-ext', requestId, result }   (success)
//   { source: 'crypto-wallet-ext', requestId, error }    (failure)

const SOURCE_PAGE = 'crypto-wallet-page'
const SOURCE_EXT  = 'crypto-wallet-ext'

// ── Pending request registry ──────────────────────────────────────────────
//
// Maps requestId → { resolve, reject } for each in-flight request.
let nextId = 1
const pending = new Map<number, {
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
}>()

// ── Listen for responses from the content script ─────────────────────────
window.addEventListener('message', (event) => {
  // Ignore messages not from our extension
  if (event.source !== window) return
  if (!event.data || event.data.source !== SOURCE_EXT) return

  const { requestId, result, error } = event.data
  const handlers = pending.get(requestId)
  if (!handlers) return

  pending.delete(requestId)

  if (error) {
    handlers.reject(new Error(error))
  } else {
    handlers.resolve(result)
  }
})

// ── EIP-1193 provider ─────────────────────────────────────────────────────
//
// EIP-1193 is the standard interface all dApps expect.
// It defines: provider.request({ method, params }) → Promise<result>
//
// We implement only the three methods needed for a minimal dApp:
//   eth_requestAccounts — connect and get the user's address
//   eth_sendTransaction — sign and broadcast a transaction
//   personal_sign       — sign an arbitrary message

const provider = {
  isMetaMask: true, // many dApps check this flag to detect a wallet

  // The core method: every dApp call goes through here
  request({ method, params }: { method: string; params?: unknown[] }): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const requestId = nextId++
      pending.set(requestId, { resolve, reject })

      // Send the request to the content script via postMessage.
      // The content script will forward it to the background worker.
      window.postMessage(
        { source: SOURCE_PAGE, requestId, method, params: params ?? [] },
        '*'  // targetOrigin '*' is fine here — the content script filters by source
      )

      // Safety timeout: reject after 5 minutes if no response arrives.
      // This prevents Promises from hanging forever if the background is
      // suspended or the user ignores an approval popup.
      setTimeout(() => {
        if (pending.has(requestId)) {
          pending.delete(requestId)
          reject(new Error('Request timed out.'))
        }
      }, 5 * 60 * 1000)
    })
  },

  // Legacy convenience aliases used by older dApps
  // Both just delegate to request().
  send(method: string, params: unknown[]): Promise<unknown> {
    return this.request({ method, params })
  },
  sendAsync(
    payload: { method: string; params: unknown[] },
    callback: (err: Error | null, result?: unknown) => void
  ): void {
    this.request(payload)
      .then((result) => callback(null, result))
      .catch((err: Error) => callback(err))
  },
}

// Attach to window. Use defineProperty so it's not accidentally overwritten.
Object.defineProperty(window, 'ethereum', {
  value: provider,
  writable: false,
  configurable: false,
})

// Announce to the page that a provider is available (EIP-6963 lite).
window.dispatchEvent(new Event('ethereum#initialized'))
