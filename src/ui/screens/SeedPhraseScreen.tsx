// src/ui/screens/SeedPhraseScreen.tsx
//
// Shown immediately after wallet creation.
// Displays the 12-word seed phrase so the user can write it down.
//
// FROM HERE:
//   → user checks "I've saved it" → confirmSeedPhrase() → UnlockScreen
//
// SECURITY:
//   The mnemonic is held in WalletContext.pendingMnemonic only for the
//   duration of this screen. confirmSeedPhrase() clears it from memory.
//   It is never written to storage unencrypted.

import { useState } from 'react'
import { useWallet } from '@state'
import * as S from '../styles.ts'

export function SeedPhraseScreen() {
  const { pendingMnemonic, confirmSeedPhrase } = useWallet()
  const [confirmed, setConfirmed] = useState(false)
  const [revealed, setRevealed] = useState(false)

  // Split the 12-word phrase into an array for grid display
  const words = pendingMnemonic?.split(' ') ?? []

  return (
    <div style={S.screen}>
      <h1 style={S.heading}>Save Your Seed Phrase</h1>
      <p style={S.subheading}>
        Write these 12 words down in order and keep them somewhere safe.
        They are the only way to recover your wallet if you forget your password.
      </p>

      {/* Warning banner */}
      <div style={{
        ...S.card,
        backgroundColor: '#451a1a',
        borderColor: '#ef4444',
        marginBottom: 20,
      }}>
        <p style={{ color: '#fca5a5', fontSize: 13, margin: 0 }}>
          ⚠️ Never share your seed phrase. Anyone with these words controls your wallet.
        </p>
      </div>

      {/* Seed phrase grid — blurred until user clicks reveal */}
      <div
        style={{
          ...S.card,
          position: 'relative',
          marginBottom: 20,
          cursor: revealed ? 'default' : 'pointer',
          userSelect: revealed ? 'text' : 'none',
        }}
        onClick={() => setRevealed(true)}
        title={revealed ? '' : 'Click to reveal seed phrase'}
      >
        {/* 12 words in a 3-column grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          filter: revealed ? 'none' : 'blur(6px)',
          transition: 'filter 0.2s',
        }}>
          {words.map((word, i) => (
            <div
              key={i}
              style={{
                backgroundColor: S.colors.bg,
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: 13,
                fontFamily: 'monospace',
              }}
            >
              <span style={{ color: S.colors.textSecondary, fontSize: 11 }}>{i + 1}. </span>
              {word}
            </div>
          ))}
        </div>

        {/* Overlay prompt when blurred */}
        {!revealed && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 10,
          }}>
            <span style={{ color: S.colors.textSecondary, fontSize: 13 }}>
              👁 Click to reveal
            </span>
          </div>
        )}
      </div>

      {/* Confirmation checkbox */}
      <label style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        cursor: 'pointer',
        fontSize: 13,
        marginBottom: 16,
        color: S.colors.textPrimary,
      }}>
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: S.colors.primary }}
        />
        I've written down my seed phrase and stored it safely.
      </label>

      {/* Continue button — only enabled once revealed + confirmed */}
      <button
        onClick={confirmSeedPhrase}
        disabled={!confirmed || !revealed}
        style={{
          ...S.btnPrimary,
          opacity: confirmed && revealed ? 1 : 0.4,
          cursor: confirmed && revealed ? 'pointer' : 'not-allowed',
        }}
      >
        Continue to Unlock
      </button>
    </div>
  )
}
