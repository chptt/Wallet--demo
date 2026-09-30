// src/ui/screens/DashboardScreen.tsx
//
// Main wallet view — address, balance, network selector, Send/Receive.

import { useState } from 'react'
import { useWallet } from '@state'
import * as S from '../styles.ts'

export function DashboardScreen() {
  const {
    address,
    balance,
    isFetchingBalance,
    network,
    availableNetworks,
    switchNetwork,
    refreshBalance,
    navigate,
    lock,
    error,
  } = useWallet()

  const [copied, setCopied] = useState(false)

  // Colour for the network badge in the header dropdown.
  // local (Anvil) → cyan, testnet → amber, mainnet → green
  function networkColor() {
    if (network.local)   return S.colors.local
    if (network.testnet) return S.colors.testnet
    return S.colors.success
  }

  function shortAddress(addr: string) {
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`
  }

  async function copyAddress() {
    if (!address) return
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function formatBalance(raw: string | null) {
    if (raw === null) return '—'
    const num = parseFloat(raw)
    if (isNaN(num)) return '—'
    return num.toFixed(6).replace(/\.?0+$/, '')
  }

  function handleNetworkSwitch(chainId: number) {
    switchNetwork(chainId)
    const n = availableNetworks.find((x) => x.chainId === chainId)
    if (n) {
      // Visual confirmation in the browser console so you can verify
      // you're on Anvil and not mainnet by mistake.
      console.log(
        `%c[Wallet] Active network → ${n.name} (chainId ${n.chainId}) ${n.rpcUrl}`,
        `color: ${n.local ? '#06b6d4' : n.testnet ? '#f59e0b' : '#22c55e'}; font-weight: bold`
      )
    }
  }

  return (
    <div style={S.screen}>

      {/* ── Anvil / local dev banner ──────────────────────────────────── */}
      {/* Shown whenever a local network is selected so it's impossible
          to mistake it for mainnet. */}
      {network.local && (
        <div style={{
          backgroundColor: '#0e3a42',
          border: `1px solid ${S.colors.local}`,
          borderRadius: 8,
          padding: '8px 12px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>🔧</span>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: S.colors.local }}>
              LOCAL DEV NETWORK
            </p>
            <p style={{ margin: 0, fontSize: 11, color: S.colors.textSecondary }}>
              {network.name} · {network.rpcUrl} · chainId {network.chainId}
            </p>
          </div>
        </div>
      )}

      {/* ── Header: network selector + lock ──────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <select
          value={network.chainId}
          onChange={(e) => handleNetworkSwitch(Number(e.target.value))}
          style={{
            backgroundColor: S.colors.surface,
            border: `1px solid ${S.colors.border}`,
            borderRadius: 20,
            color: networkColor(),
            fontSize: 12,
            fontWeight: 600,
            padding: '4px 10px',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {availableNetworks.map((n) => (
            <option key={n.chainId} value={n.chainId} style={{ color: S.colors.textPrimary }}>
              {n.local ? '🔧 ' : n.testnet ? '🧪 ' : '⬡ '}{n.name}
            </option>
          ))}
        </select>

        <button
          onClick={lock}
          title="Lock wallet"
          style={{
            background: 'none',
            border: `1px solid ${S.colors.border}`,
            borderRadius: 20,
            color: S.colors.textSecondary,
            fontSize: 12,
            padding: '4px 12px',
            cursor: 'pointer',
          }}
        >
          🔒 Lock
        </button>
      </div>

      {/* ── Account card ─────────────────────────────────────────────── */}
      <div style={{ ...S.card, marginBottom: 20, textAlign: 'center' }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: network.local
            ? `linear-gradient(135deg, ${S.colors.local}, #7c3aed)`
            : `linear-gradient(135deg, ${S.colors.primary}, #06b6d4)`,
          margin: '0 auto 12px',
        }} />

        {/* Address */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, color: S.colors.textPrimary, fontFamily: 'monospace' }}>
            {address ? shortAddress(address) : '—'}
          </span>
          <button
            onClick={copyAddress}
            title="Copy full address"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: S.colors.textSecondary, padding: 0 }}
          >
            {copied ? '✅' : '📋'}
          </button>
        </div>

        {/* Balance */}
        <div style={{ marginTop: 16 }}>
          <p style={{ margin: 0, fontSize: 12, color: S.colors.textSecondary }}>Balance</p>
          <p style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700 }}>
            {isFetchingBalance
              ? <span style={{ fontSize: 16, color: S.colors.textSecondary }}>Loading…</span>
              : <>{formatBalance(balance)} <span style={{ fontSize: 16, color: S.colors.textSecondary }}>{network.currency}</span></>
            }
          </p>
        </div>

        <button
          onClick={refreshBalance}
          disabled={isFetchingBalance}
          style={{ background: 'none', border: 'none', color: S.colors.textSecondary, cursor: 'pointer', fontSize: 12, marginTop: 8 }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* ── Action buttons ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <button style={{ ...S.btnPrimary, marginTop: 0, flex: 1 }} onClick={() => navigate('send')}>
          ↑ Send
        </button>
        <button style={{ ...S.btnSecondary, marginTop: 0, flex: 1 }} onClick={() => alert('Receive — coming soon!')}>
          ↓ Receive
        </button>
      </div>

      {/* ── Error display ─────────────────────────────────────────────── */}
      {error && <p style={S.errorText}>{error}</p>}

      {/* ── Network info footer ───────────────────────────────────────── */}
      <div style={{ marginTop: 'auto', textAlign: 'center' }}>
        {/* RPC URL — always visible so you know exactly where requests go */}
        <p style={{ fontSize: 11, color: S.colors.textSecondary, margin: '0 0 6px' }}>
          RPC: {network.rpcUrl}
        </p>

        {/* Explorer link — only shown when the network has one */}
        {address && network.explorerUrl && (
          <a
            href={`${network.explorerUrl}/address/${address}`}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 12, color: S.colors.textSecondary }}
          >
            View on Etherscan ↗
          </a>
        )}

        {/* Local network note */}
        {network.local && (
          <p style={{ fontSize: 11, color: S.colors.local, margin: '6px 0 0' }}>
            Make sure <code style={{ fontFamily: 'monospace' }}>anvil</code> is running locally.
          </p>
        )}
      </div>

    </div>
  )
}
