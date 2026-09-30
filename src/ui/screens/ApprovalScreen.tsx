// src/ui/screens/ApprovalScreen.tsx
//
// This screen is shown when the wallet popup is opened by the background
// worker to get user approval for a dApp request.
//
// It reads the request details from the URL hash (set by the background
// when it calls chrome.windows.create), shows the user what the dApp
// wants to do, and sends APPROVAL_RESPONSE back to the background.
//
// Supported methods:
//   eth_requestAccounts — "Site X wants to connect to your wallet"
//   eth_sendTransaction — "Site X wants to send a transaction"
//   personal_sign       — "Site X wants you to sign a message"

import { useState } from 'react'
import * as S from '../styles.ts'

// ── Parse approval params from the URL hash ────────────────────────────────
//
// Background opens: index.html#approval?id=...&method=...&origin=...&params=...
// We parse that here without a router library.

function parseHashParams(): {
  approvalId: string
  method: string
  origin: string
  params: unknown[]
} | null {
  const hash = window.location.hash // e.g. "#approval?id=...&method=..."
  if (!hash.startsWith('#approval')) return null

  const queryStr = hash.slice('#approval?'.length)
  const p = new URLSearchParams(queryStr)

  const approvalId = p.get('id') ?? ''
  const method     = p.get('method') ?? ''
  const origin     = p.get('origin') ?? ''
  const paramsRaw  = p.get('params') ?? '[]'

  let params: unknown[] = []
  try { params = JSON.parse(decodeURIComponent(paramsRaw)) } catch { /* ignore */ }

  if (!approvalId || !method) return null
  return { approvalId, method, origin, params }
}

// ── Send the response to the background and close this window ─────────────

async function sendResponse(
  approvalId: string,
  approved: boolean,
  password?: string
): Promise<void> {
  await chrome.runtime.sendMessage({
    type: 'APPROVAL_RESPONSE',
    approvalId,
    approved,
    password,
  })
  window.close()
}

// ── Component ──────────────────────────────────────────────────────────────

export function ApprovalScreen() {
  const request = parseHashParams()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // If not an approval URL, render nothing (normal popup flow takes over)
  if (!request) return null

  const { approvalId, method, origin, params } = request

  async function approve() {
    setError('')
    // eth_requestAccounts and signing methods need the password so the
    // background can decrypt the vault.
    if (!password.trim()) {
      setError('Enter your wallet password to approve.')
      return
    }
    setIsProcessing(true)
    await sendResponse(approvalId, true, password)
  }

  function reject() {
    sendResponse(approvalId, false)
  }

  // ── Render different UI depending on the method ──────────────────────────

  return (
    <div style={S.screen}>
      {/* Site identity */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🌐</div>
        <p style={{ fontSize: 13, color: S.colors.textSecondary, margin: 0 }}>
          Request from
        </p>
        <p style={{
          fontSize: 15,
          fontWeight: 700,
          color: S.colors.textPrimary,
          wordBreak: 'break-all',
          margin: '4px 0 0',
        }}>
          {origin}
        </p>
      </div>

      {/* Method-specific description */}
      <MethodDescription method={method} params={params} />

      <hr style={S.divider} />

      {/* Password entry — always required so the background can sign */}
      <div style={{ marginBottom: 4 }}>
        <label style={S.label} htmlFor="pwd">Wallet Password</label>
        <input
          id="pwd"
          type="password"
          placeholder="Enter your password to approve"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && approve()}
          style={S.input}
          autoFocus
        />
      </div>

      {error && <p style={S.errorText}>{error}</p>}

      {/* Approve / Reject */}
      <button
        onClick={approve}
        disabled={isProcessing}
        style={{ ...S.btnPrimary, marginTop: 16, opacity: isProcessing ? 0.6 : 1 }}
      >
        {isProcessing ? 'Processing…' : 'Approve'}
      </button>
      <button
        onClick={reject}
        disabled={isProcessing}
        style={{ ...S.btnDanger, marginTop: 8 }}
      >
        Reject
      </button>

      <p style={{ fontSize: 11, color: S.colors.textSecondary, textAlign: 'center', marginTop: 16 }}>
        Only approve requests from sites you trust.
      </p>
    </div>
  )
}

// ── Method description sub-component ──────────────────────────────────────

function MethodDescription({ method, params }: { method: string; params: unknown[] }) {
  if (method === 'eth_requestAccounts') {
    return (
      <div style={S.card}>
        <p style={{ margin: 0, fontWeight: 600, marginBottom: 6 }}>Connect Wallet</p>
        <p style={{ margin: 0, fontSize: 13, color: S.colors.textSecondary }}>
          This site wants to see your wallet address and connect to your wallet.
        </p>
      </div>
    )
  }

  if (method === 'eth_sendTransaction') {
    // params[0] is the tx object: { to, value, data, gas }
    const tx = (params[0] ?? {}) as Record<string, string>
    const valueWei = tx.value ? BigInt(tx.value) : 0n
    // Convert wei → ETH for display (18 decimal places, trim trailing zeros)
    const valueEth = (Number(valueWei) / 1e18).toFixed(6).replace(/\.?0+$/, '')

    return (
      <div style={S.card}>
        <p style={{ margin: '0 0 10px', fontWeight: 600 }}>Send Transaction</p>
        <DetailRow label="To"    value={tx.to ? `${tx.to.slice(0, 10)}…${tx.to.slice(-8)}` : '(contract)'} />
        <DetailRow label="Value" value={`${valueEth} ETH`} />
        {tx.data && tx.data !== '0x' && (
          <DetailRow label="Data" value={`${tx.data.slice(0, 20)}…`} mono />
        )}
      </div>
    )
  }

  if (method === 'personal_sign') {
    const hexMsg = (params[0] as string) ?? ''
    // Try to decode hex to a readable string for display
    let readable = hexMsg
    try {
      if (hexMsg.startsWith('0x')) {
        readable = decodeURIComponent(
          hexMsg.slice(2).replace(/../g, '%$&')
        )
      }
    } catch { /* show raw hex if decode fails */ }

    return (
      <div style={S.card}>
        <p style={{ margin: '0 0 10px', fontWeight: 600 }}>Sign Message</p>
        <p style={{ fontSize: 12, color: S.colors.textSecondary, margin: 0 }}>Message:</p>
        <p style={{
          fontSize: 13,
          fontFamily: 'monospace',
          wordBreak: 'break-all',
          color: S.colors.textPrimary,
          marginTop: 4,
          maxHeight: 80,
          overflow: 'auto',
        }}>
          {readable}
        </p>
      </div>
    )
  }

  return (
    <div style={S.card}>
      <p style={{ margin: 0, fontWeight: 600 }}>{method}</p>
      <p style={{ margin: '6px 0 0', fontSize: 12, color: S.colors.textSecondary, fontFamily: 'monospace' }}>
        {JSON.stringify(params, null, 2).slice(0, 200)}
      </p>
    </div>
  )
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
      <span style={{ fontSize: 12, color: S.colors.textSecondary }}>{label}</span>
      <span style={{ fontSize: 13, fontFamily: mono ? 'monospace' : 'inherit', color: S.colors.textPrimary }}>
        {value}
      </span>
    </div>
  )
}
