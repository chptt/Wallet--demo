// src/content/contentScript.ts
//
// Chrome loads this as a content script into every tab (see manifest.json).
// It runs in an ISOLATED world — it can use chrome.* APIs but shares the
// page's DOM (not its JS globals).
//
// Two jobs:
//   1. Inject injectProvider.js into the page's MAIN world so that
//      window.ethereum is created before any page scripts run.
//   2. Bridge messages between the injected provider (postMessage) and
//      the background service worker (chrome.runtime.sendMessage).

// ── 1. Inject the provider script into the main world ─────────────────────
//
// We cannot set window.ethereum here because we're in an isolated world.
// Instead we inject a <script> tag that loads injectProvider.js, which
// runs in the main world and can set window.ethereum.
//
// chrome.runtime.getURL() gives us the extension URL for the file,
// which is listed in manifest.json > web_accessible_resources.
const script = document.createElement('script')
script.src = chrome.runtime.getURL('injectProvider.js')
// Must be classic (not "module") — Chrome does not support ES module scripts
// injected via web_accessible_resources into the page's main world.
script.type = 'text/javascript'

// Insert before anything else so the provider is ready before dApp code runs.
;(document.head || document.documentElement).prepend(script)

// Clean up the <script> tag after it loads (not required, just tidy).
script.addEventListener('load', () => script.remove())

// ── 2. Bridge: page → background ──────────────────────────────────────────
//
// Listen for postMessages from the injected provider, forward them to the
// background worker via chrome.runtime.sendMessage, and send the reply back.

const SOURCE_PAGE = 'crypto-wallet-page'
const SOURCE_EXT  = 'crypto-wallet-ext'

window.addEventListener('message', async (event) => {
  // Only handle messages from our injected provider
  if (event.source !== window) return
  if (!event.data || event.data.source !== SOURCE_PAGE) return

  const { requestId, method, params } = event.data

  try {
    // Forward the request to the background service worker.
    // The background does all the heavy lifting (approval, signing, etc.).
    // chrome.runtime.sendMessage returns a Promise in MV3.
    const response = await chrome.runtime.sendMessage({
      type: 'PROVIDER_REQUEST',
      origin: window.location.origin,
      requestId,
      method,
      params,
    })

    if (response.error) {
      // Background returned a structured error
      window.postMessage({ source: SOURCE_EXT, requestId, error: response.error }, '*')
    } else {
      window.postMessage({ source: SOURCE_EXT, requestId, result: response.result }, '*')
    }
  } catch (err) {
    // chrome.runtime.sendMessage can throw if the background is not available
    const msg = err instanceof Error ? err.message : 'Extension error.'
    window.postMessage({ source: SOURCE_EXT, requestId, error: msg }, '*')
  }
})
