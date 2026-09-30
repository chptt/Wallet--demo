// src/ui/screens/OnboardingScreen.tsx
//
// The first screen a new user sees — no wallet exists yet.
//
// FROM HERE the user can go to:
//   → password setup → SeedPhraseScreen   (create new wallet)
//   → ImportScreen                        (restore from seed phrase)

import { useState } from 'react'
import { useWallet } from '@state'
import * as S from '../styles.ts'

export function OnboardingScreen() {
  const { createWallet, navigate, error } = useWallet()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [localError, setLocalError] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  async function handleCreate() {
    setLocalError('')

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setLocalError('Passwords do not match.')
      return
    }

    setIsCreating(true)
    await createWallet(password)
    // Navigation to 'seed-phrase' is handled inside createWallet()
    // in WalletContext once the vault is saved successfully.
    setIsCreating(false)
  }

  return (
    <div style={S.screen}>
      {/* Logo / title area */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🔐</div>
        <h1 style={S.heading}>Crypto Wallet</h1>
        <p style={S.subheading}>Create a new wallet or restore an existing one.</p>
      </div>

      {/* Password setup for new wallet */}
      <div style={{ marginBottom: 12 }}>
        <label style={S.label} htmlFor="pw">New Password</label>
        <input
          id="pw"
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={S.input}
          autoFocus
        />
      </div>

      <div style={{ marginBottom: 4 }}>
        <label style={S.label} htmlFor="pw2">Confirm Password</label>
        <input
          id="pw2"
          type="password"
          placeholder="Repeat your password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          style={S.input}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
      </div>

      {/* Validation errors */}
      {(localError || error) && (
        <p style={S.errorText}>{localError || error}</p>
      )}

      {/* Primary action */}
      <button
        onClick={handleCreate}
        disabled={isCreating}
        style={{ ...S.btnPrimary, marginTop: 16, opacity: isCreating ? 0.7 : 1 }}
      >
        {isCreating ? 'Creating…' : 'Create New Wallet'}
      </button>

      <hr style={S.divider} />

      {/* Secondary action — import existing */}
      <button
        onClick={() => navigate('import')}
        style={S.btnSecondary}
      >
        Import Existing Wallet
      </button>

      <p style={{ ...S.subheading, marginTop: 16, fontSize: 11, textAlign: 'center' }}>
        Your keys are encrypted locally. We never see your password or seed phrase.
      </p>
    </div>
  )
}
