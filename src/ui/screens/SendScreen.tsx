// src/ui/screens/SendScreen.tsx
//
// The Send flow has three internal stages driven by a local `stage` variable:
//
//   'form'      — user enters recipient address + amount
//   'review'    — gas estimate shown, user confirms or goes back
//   'pending'   — transaction is broadcasting / waiting for confirmation
//   'success'   — transaction confirmed, shows hash + explorer link
//   'error'     — something went wrong, shows message + retry option
//
// FROM HERE:
//   → Cancel / back → DashboardScreen
//   → Success → DashboardScreen (balance auto-refreshed in context)

import { useState } from 'react'
import { useWallet } from '@state'
import { SendError } from '@core'
import type { GasEstimate, TxResult } from '@core'
import * as S from '../styles.ts'

// ── Types ──────────────────────────────────────────────────────────────────

type Stage = 'form' | 'review' | 'pending' | 'success' | 'error'

// ── Helpers ────────────────────────────────────────────────────────────────

// Format a raw ETH string to at most 8 significant decimal places.
function fmtEth(raw: string): string {
  const n = parseFloat(raw)
  return isNaN(n) ? raw : n.toFixed(8).replace(/\.?0+$/, '')
}

// ── Component ──────────────────────────────────────────────────────────────

export function SendScreen() {
  const { navigate, network, balance, estimateGas, sendTx } = useWallet()

  // Form fields
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')

  // Flow state
  const [stage, setStage] = useState<Stage>('form')
  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null)
  const [txResult, setTxResult] = useState<TxResult | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ to?: string; amount?: string }>({})
  const [txError, setTxError] = useState('')

  // ── Stage: form ────────────────────────────────────────────────────────

  async function handleEstimate() {
    setFieldErrors({})
    setTxError('')

    try {
      const estimate = await estimateGas(to, amount)
      setGasEstimate(estimate)
      setStage('review')
    } catch (err) {
      if (err instanceof SendError) {
        // Map the typed error code to the right field so the user knows
        // exactly what to fix.
        if (err.code === 'INVALID_ADDRESS') {
          setFieldErrors({ to: err.message })
        } else if (err.code === 'INVALID_AMOUNT' || err.code === 'INSUFFICIENT_BALANCE') {
          setFieldErrors({ amount: err.message })
        } else {
          // GAS_ESTIMATION_FAILED — network issue, not a field problem
          setTxError(err.message)
        }
      } else {
        setTxError('Unexpected error. Please try again.')
      }
    }
  }

  // ── Stage: review → confirm ────────────────────────────────────────────

  async function handleConfirm() {
    if (!gasEstimate) return
    setStage('pending')
    setTxError('')

    try {
      const result = await sendTx(to, amount, gasEstimate)
      setTxResult(result)
      setStage('success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transaction failed.'
      setTxError(msg)
      setStage('error')
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  // Shared back button
  function BackButton({ onClick }: { onClick: () => void }) {
    return (
      <button
        onClick={onClick}
        style={{
          background: 'none',
          border: 'none',
          color: S.colors.textSecondary,
          cursor: 'pointer',
          fontSize: 13,
          padding: 0,
          marginBottom: 20,
          alignSelf: 'flex-start',
        }}
      >
        ← Back
      </button>
    )
  }

  // ── Stage: form ────────────────────────────────────────────────────────
  if (stage === 'form') {
    return (
      <div style={S.screen}>
        <BackButton onClick={() => navigate('dashboard')} />

        <h1 style={S.heading}>Send ETH</h1>
        <p style={S.subheading}>
          Sending on <strong>{network.name}</strong>.
          Your balance: {balance !== null ? `${fmtEth(balance)} ETH` : '—'}
        </p>

        {/* Recipient address */}
        <div style={{ marginBottom: 14 }}>
          <label style={S.label} htmlFor="to">Recipient Address</label>
          <input
            id="to"
            type="text"
            placeholder="0x..."
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={{
              ...S.input,
              borderColor: fieldErrors.to ? S.colors.danger : S.colors.border,
              fontFamily: 'monospace',
              fontSize: 13,
            }}
            autoComplete="off"
            spellCheck={false}
          />
          {fieldErrors.to && <p style={S.errorText}>{fieldErrors.to}</p>}
        </div>

        {/* Amount */}
        <div style={{ marginBottom: 4 }}>
          <label style={S.label} htmlFor="amount">Amount (ETH)</label>
          <div style={{ position: 'relative' }}>
            <input
              id="amount"
              type="number"
              min="0"
              step="0.0001"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{
                ...S.input,
                borderColor: fieldErrors.amount ? S.colors.danger : S.colors.border,
                paddingRight: 48,
              }}
            />
            {/* Currency label inside the input */}
            <span style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: S.colors.textSecondary,
              fontSize: 13,
              pointerEvents: 'none',
            }}>
              ETH
            </span>
          </div>
          {fieldErrors.amount && <p style={S.errorText}>{fieldErrors.amount}</p>}
        </div>

        {/* Max button */}
        {balance && (
          <button
            onClick={() => setAmount(balance)}
            style={{
              background: 'none',
              border: 'none',
              color: S.colors.primary,
              cursor: 'pointer',
              fontSize: 12,
              padding: '4px 0',
              alignSelf: 'flex-start',
            }}
          >
            Use max
          </button>
        )}

        {txError && <p style={{ ...S.errorText, marginTop: 12 }}>{txError}</p>}

        <button
          onClick={handleEstimate}
          disabled={!to || !amount}
          style={{
            ...S.btnPrimary,
            marginTop: 16,
            opacity: !to || !amount ? 0.5 : 1,
            cursor: !to || !amount ? 'not-allowed' : 'pointer',
          }}
        >
          Estimate Fee →
        </button>
      </div>
    )
  }

  // ── Stage: review ─────────────────────────────────────────────────────
  if (stage === 'review' && gasEstimate) {
    // Total cost = amount + gas fee
    const totalEth = (parseFloat(amount) + parseFloat(gasEstimate.gasCostEth)).toFixed(8)
      .replace(/\.?0+$/, '')

    return (
      <div style={S.screen}>
        <BackButton onClick={() => setStage('form')} />

        <h1 style={S.heading}>Confirm Transaction</h1>
        <p style={S.subheading}>Review the details before sending.</p>

        {/* Summary card */}
        <div style={{ ...S.card, marginBottom: 16 }}>
          <Row label="To" value={`${to.slice(0, 10)}…${to.slice(-8)}`} mono />
          <Divider />
          <Row label="Amount" value={`${fmtEth(amount)} ETH`} />
          <Row
            label="Estimated fee"
            value={`~${fmtEth(gasEstimate.gasCostEth)} ETH`}
            muted
          />
          <Divider />
          <Row label="Total (max)" value={`${totalEth} ETH`} bold />
        </div>

        {/* Network */}
        <div style={{ ...S.card, marginBottom: 20 }}>
          <Row label="Network" value={network.name} />
          <Row label="Gas limit" value={gasEstimate.gasLimit.toString()} muted />
        </div>

        {/* Warning if testnet */}
        {network.testnet && (
          <p style={{ fontSize: 12, color: S.colors.testnet, marginBottom: 12 }}>
            ⚠️ You are on a testnet. These tokens have no real value.
          </p>
        )}

        <button onClick={handleConfirm} style={S.btnPrimary}>
          Confirm & Send
        </button>
        <button onClick={() => setStage('form')} style={{ ...S.btnSecondary, marginTop: 8 }}>
          Cancel
        </button>
      </div>
    )
  }

  // ── Stage: pending ────────────────────────────────────────────────────
  if (stage === 'pending') {
    return (
      <div style={{ ...S.screen, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
        {/* Simple CSS spinner */}
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: `4px solid ${S.colors.border}`,
          borderTopColor: S.colors.primary,
          animation: 'spin 0.9s linear infinite',
        }} />
        {/* The keyframe is injected inline — works without a CSS file */}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        <p style={{ color: S.colors.textSecondary, fontSize: 14 }}>
          Broadcasting transaction…
        </p>
        <p style={{ color: S.colors.textSecondary, fontSize: 12 }}>
          Waiting for confirmation. This may take 15–30 seconds.
        </p>
      </div>
    )
  }

  // ── Stage: success ────────────────────────────────────────────────────
  if (stage === 'success' && txResult) {
    return (
      <div style={{ ...S.screen, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
        <h1 style={{ ...S.heading, marginBottom: 6 }}>Transaction Sent</h1>
        <p style={{ ...S.subheading, marginBottom: 20 }}>
          Confirmed in block #{txResult.receipt.blockNumber.toString()}.
        </p>

        {/* Transaction hash */}
        <div style={{ ...S.card, width: '100%', marginBottom: 20, textAlign: 'left' }}>
          <p style={{ ...S.label, marginBottom: 4 }}>Transaction Hash</p>
          <p style={{
            fontFamily: 'monospace',
            fontSize: 12,
            color: S.colors.textSecondary,
            wordBreak: 'break-all',
            margin: 0,
          }}>
            {txResult.hash}
          </p>
        </div>

        {/* Explorer link */}
        <a
          href={`${network.explorerUrl}/tx/${txResult.hash}`}
          target="_blank"
          rel="noreferrer"
          style={{ color: S.colors.primary, fontSize: 13, marginBottom: 24 }}
        >
          View on Etherscan ↗
        </a>

        <button
          onClick={() => navigate('dashboard')}
          style={{ ...S.btnPrimary, width: '100%' }}
        >
          Back to Wallet
        </button>
      </div>
    )
  }

  // ── Stage: error ──────────────────────────────────────────────────────
  return (
    <div style={{ ...S.screen, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ fontSize: 52, marginBottom: 12 }}>❌</div>
      <h1 style={{ ...S.heading, marginBottom: 6 }}>Transaction Failed</h1>
      <p style={{ color: S.colors.danger, fontSize: 13, marginBottom: 20 }}>{txError}</p>

      <button onClick={() => setStage('form')} style={S.btnPrimary}>
        Try Again
      </button>
      <button onClick={() => navigate('dashboard')} style={{ ...S.btnSecondary, marginTop: 8 }}>
        Back to Wallet
      </button>
    </div>
  )
}

// ── Small layout helpers (used only inside this file) ──────────────────────

function Row({
  label,
  value,
  mono = false,
  muted = false,
  bold = false,
}: {
  label: string
  value: string
  mono?: boolean
  muted?: boolean
  bold?: boolean
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
      <span style={{ fontSize: 13, color: S.colors.textSecondary }}>{label}</span>
      <span style={{
        fontSize: 13,
        color: muted ? S.colors.textSecondary : S.colors.textPrimary,
        fontFamily: mono ? 'monospace' : 'inherit',
        fontWeight: bold ? 700 : 400,
      }}>
        {value}
      </span>
    </div>
  )
}

function Divider() {
  return <hr style={{ ...S.divider, margin: '4px 0' }} />
}
