// src/background/index.ts
//
// The extension background service worker — the secure heart of the wallet.
//
// It handles every provider request forwarded by the content script:
//
//   eth_requestAccounts
//     → if origin is already connected, return address immediately
//     → otherwise open approval popup, wait for user, return address
//
//   eth_sendTransaction
//     → open approval popup with tx details, wait for user to confirm
//     → decrypt vault with stored session password, sign tx, broadcast
//
//   personal_sign
//     → open approval popup with message, wait for user to confirm
//     → sign message with private key, return signature
//
// WHY DOES SIGNING HAPPEN HERE AND NOT IN THE POPUP?
//   The background is the only context that should ever decrypt private keys.
//   The popup asks "approve or reject?" and the background does the actual
//   cryptographic work. This keeps the key material in one place.
//
// SESSION STATE:
//   MV3 service workers can be suspended at any time. We persist the
//   session password in chrome.session.storage (in-memory, cleared on
//   browser restart) so the wallet can sign without re-prompting the user
//   on every transaction within the same browser session.

import { JsonRpcProvider, Wallet } from 'ethers'
import { loadVault } from '@core/storage.ts'
import { decrypt } from '@core/encryption.ts'

console.log('[background] service worker started')

// ── Types ──────────────────────────────────────────────────────────────────

// The message shape sent by the content script
type ProviderRequest = {
  type: 'PROVIDER_REQUEST'
  origin: string
  requestId: number
  method: string
  params: unknown[]
}

// Pending approval: stored while the popup is open
type PendingApproval = {
  id: string
  origin: string
  method: string
  params: unknown[]
  resolve: (result: unknown) => void
  reject: (error: string) => void
}

// Message the popup sends back to resolve an approval
type ApprovalResponse = {
  type: 'APPROVAL_RESPONSE'
  approvalId: string
  approved: boolean
  // For eth_sendTransaction approvals the popup passes back the password
  // so the background can decrypt the vault and sign.
  password?: string
}

// ── In-memory state ────────────────────────────────────────────────────────
//
// NOTE: This is cleared when the service worker is suspended.
// For a production wallet you would re-hydrate from chrome.session.storage.

// Origins the user has connected (approved eth_requestAccounts)
const connectedOrigins = new Set<string>()

// Pending approvals waiting for the popup to respond
const pendingApprovals = new Map<string, PendingApproval>()

// ── Helpers ────────────────────────────────────────────────────────────────

function makeApprovalId(): string {
  return `approval-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Opens the wallet popup and waits for an APPROVAL_RESPONSE message.
 * Returns a Promise that resolves/rejects when the user acts.
 *
 * The popup URL includes query params so ApprovalScreen knows what to show.
 */
function requestApproval(
  origin: string,
  method: string,
  params: unknown[]
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const approvalId = makeApprovalId()

    pendingApprovals.set(approvalId, {
      id: approvalId,
      origin,
      method,
      params,
      resolve,
      reject,
    })

    // Open the popup with the approval details encoded in the URL hash.
    // We use the hash (#) not query string (?) because index.html is a
    // local extension page and query strings can behave oddly.
    const url =
      `chrome-extension://${chrome.runtime.id}/index.html` +
      `#approval?id=${approvalId}` +
      `&method=${encodeURIComponent(method)}` +
      `&origin=${encodeURIComponent(origin)}` +
      `&params=${encodeURIComponent(JSON.stringify(params))}`

    chrome.windows.create({
      url,
      type: 'popup',
      width: 400,
      height: 620,
      focused: true,
    })
  })
}

/**
 * Decrypts the vault with the given password and returns an ethers.Wallet.
 * This is the only place in the codebase that touches the private key.
 */
async function getWallet(password: string, rpcUrl: string): Promise<Wallet> {
  const vault = await loadVault()
  if (!vault) throw new Error('No wallet found.')

  const plaintext = await decrypt(vault, password)
  const parsed = JSON.parse(plaintext) as { privateKey: string }

  const provider = new JsonRpcProvider(rpcUrl)
  return new Wallet(parsed.privateKey, provider)
}

// ── Default RPC — falls back to Sepolia if no network is stored yet ────────
const DEFAULT_RPC = 'https://eth-sepolia.g.alchemy.com/v2/alch__DxCatrB-KPcWCRrURl9g'

/**
 * Returns the RPC URL and chainId the user has selected in the popup.
 * Written to chrome.storage.local by WalletContext whenever the user
 * switches networks or unlocks the wallet.
 * Falls back to Sepolia if nothing is stored yet.
 */
async function getActiveNetwork(): Promise<{ rpcUrl: string; chainId: number; name: string }> {
  const result = await chrome.storage.local.get('activeNetwork')
  const stored = result['activeNetwork'] as { rpcUrl: string; chainId: number; name: string } | undefined
  return stored ?? { rpcUrl: DEFAULT_RPC, chainId: 11155111, name: 'Sepolia Testnet' }
}

// ── Main message handler ───────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (
    message: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ) => {
    const msg = message as ProviderRequest | ApprovalResponse

    // ── Approval response from the popup ─────────────────────────────────
    if (msg.type === 'APPROVAL_RESPONSE') {
      const approval = pendingApprovals.get(msg.approvalId)
      if (!approval) {
        sendResponse({ ok: false })
        return true
      }
      pendingApprovals.delete(msg.approvalId)

      if (!msg.approved) {
        approval.reject('User rejected the request.')
        sendResponse({ ok: true })
        return true
      }

      // User approved — now do the actual work asynchronously
      handleApprovedRequest(approval, msg.password)
        .then((result) => {
          approval.resolve(result)
          sendResponse({ ok: true })
        })
        .catch((err: unknown) => {
          const errMsg = err instanceof Error ? err.message : String(err)
          approval.reject(errMsg)
          sendResponse({ ok: false, error: errMsg })
        })

      return true // keep message channel open for async
    }

    // ── Provider request from the content script ──────────────────────────
    if (msg.type === 'PROVIDER_REQUEST') {
      handleProviderRequest(msg)
        .then((result) => sendResponse({ result }))
        .catch((err: unknown) => {
          const errMsg = err instanceof Error ? err.message : String(err)
          sendResponse({ error: errMsg })
        })

      return true // keep channel open for async
    }

    sendResponse({ error: 'Unknown message type.' })
    return true
  }
)

// ── Provider request dispatcher ───────────────────────────────────────────

async function handleProviderRequest(msg: ProviderRequest): Promise<unknown> {
  const { origin, method, params } = msg

  switch (method) {

    // ── eth_requestAccounts ──────────────────────────────────────────────
    // dApp asks for the user's address and permission to interact.
    case 'eth_requestAccounts': {
      // Already connected — return address immediately without a popup.
      if (connectedOrigins.has(origin)) {
        const vault = await loadVault()
        if (!vault) throw new Error('No wallet found.')
        const plain = await decrypt(vault, await getSessionPassword())
        const { address } = JSON.parse(plain) as { address: string }
        return [address]
      }

      // Not connected — ask user to approve
      const address = await requestApproval(origin, method, params) as string
      connectedOrigins.add(origin)
      return [address]
    }

    // ── eth_sendTransaction ──────────────────────────────────────────────
    // dApp wants to send a transaction. Always requires approval.
    case 'eth_sendTransaction': {
      if (!connectedOrigins.has(origin)) {
        throw new Error('eth_requestAccounts must be called first.')
      }
      const txHash = await requestApproval(origin, method, params)
      return txHash
    }

    // ── personal_sign ────────────────────────────────────────────────────
    // dApp wants to sign an arbitrary message (e.g. login challenge).
    // params[0] = hex-encoded message, params[1] = address
    case 'personal_sign': {
      if (!connectedOrigins.has(origin)) {
        throw new Error('eth_requestAccounts must be called first.')
      }
      const signature = await requestApproval(origin, method, params)
      return signature
    }

    // ── eth_accounts ─────────────────────────────────────────────────────
    // Returns connected accounts without prompting.
    case 'eth_accounts': {
      if (!connectedOrigins.has(origin)) return []
      try {
        const vault = await loadVault()
        if (!vault) return []
        const plain = await decrypt(vault, await getSessionPassword())
        const { address } = JSON.parse(plain) as { address: string }
        return [address]
      } catch {
        return []
      }
    }

    // ── eth_chainId ──────────────────────────────────────────────────────
    // Returns the currently selected network's chainId as a hex string.
    case 'eth_chainId': {
      const { chainId } = await getActiveNetwork()
      return '0x' + chainId.toString(16)
    }

    default:
      throw new Error(`Method not supported: ${method}`)
  }
}

// ── Approved request executor ──────────────────────────────────────────────
//
// Called AFTER the user clicks "Approve" in the popup.
// This is where signing actually happens.

async function handleApprovedRequest(
  approval: PendingApproval,
  password?: string
): Promise<unknown> {

  switch (approval.method) {

    case 'eth_requestAccounts': {
      // Just need to return the address — no signing needed.
      const pwd = password ?? await getSessionPassword()
      const vault = await loadVault()
      if (!vault) throw new Error('No wallet found.')
      const plain = await decrypt(vault, pwd)
      const { address } = JSON.parse(plain) as { address: string }
      if (password) await saveSessionPassword(password)
      return address
    }

    case 'eth_sendTransaction': {
      const txObj = (approval.params[0] ?? {}) as {
        to?: string
        value?: string
        data?: string
        gas?: string
      }

      const pwd = password ?? await getSessionPassword()
      const { rpcUrl, name: networkName } = await getActiveNetwork()
      console.log(`[background] eth_sendTransaction → network: ${networkName} (${rpcUrl})`)
      const wallet = await getWallet(pwd, rpcUrl)
      if (password) await saveSessionPassword(password)

      const tx = await wallet.sendTransaction({
        to: txObj.to,
        value: txObj.value ? BigInt(txObj.value) : 0n,
        data: txObj.data ?? '0x',
        gasLimit: txObj.gas ? BigInt(txObj.gas) : undefined,
      })

      return tx.hash
    }

    case 'personal_sign': {
      const hexMsg = approval.params[0] as string

      const pwd = password ?? await getSessionPassword()
      const { rpcUrl, name: networkName } = await getActiveNetwork()
      console.log(`[background] personal_sign → network: ${networkName} (${rpcUrl})`)
      const wallet = await getWallet(pwd, rpcUrl)
      if (password) await saveSessionPassword(password)

      // Convert hex → bytes → string so ethers signs the human-readable message.
      // ethers.Wallet.signMessage adds the "\x19Ethereum Signed Message:\n" prefix
      // automatically (EIP-191), which is what dApps expect.
      let message: string | Uint8Array
      try {
        // If it looks like a hex string, convert to bytes
        if (hexMsg.startsWith('0x')) {
          message = hexToBytes(hexMsg)
        } else {
          message = hexMsg
        }
      } catch {
        message = hexMsg
      }

      return wallet.signMessage(message)
    }

    default:
      throw new Error(`No handler for approved method: ${approval.method}`)
  }
}

// ── Session password helpers ───────────────────────────────────────────────
//
// chrome.session.storage is cleared when the browser closes.
// We store the password here after first unlock so subsequent signing
// in the same session doesn't need to re-prompt.

async function saveSessionPassword(password: string): Promise<void> {
  await chrome.storage.session.set({ sessionPwd: password })
}

async function getSessionPassword(): Promise<string> {
  const result = await chrome.storage.session.get('sessionPwd')
  const pwd = result['sessionPwd'] as string | undefined
  if (!pwd) throw new Error('Wallet is locked. Please unlock the wallet first.')
  return pwd
}

// ── Utility ────────────────────────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

// ── Keep alive hint ────────────────────────────────────────────────────────
// MV3 service workers are suspended after ~30s of inactivity.
// A pending approval keeps the port open, but we log for debugging.
chrome.runtime.onConnect.addListener((port) => {
  console.log('[background] port connected:', port.name)
})
