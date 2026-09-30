// src/ui/screens/UnlockScreen.tsx
//
// Shown when a vault exists in storage but no keys are in memory.
// This happens on every extension open (MV3 service workers don't
// persist memory between popup sessions).
//
// FROM HERE:
//   → correct password → unlock() → DashboardScreen
//   → "Forgot password?" → OnboardingScreen (user must re-import)

import { useState } from 'react'
import { useWallet } from '@state'
import * as S from '../styles.ts'

export function UnlockScreen() {
  const { unlock, navigate, error } = useWallet()
  const [password, setPassword] = useState('')
  const [isUnlocking, setIsUnlocking] = useState(false)

  async function handleUnlock() {
    if (!password) return
    setIsUnlocking(true)
    await unlock(password)
    // Navigation to 'dashboard' is handled inside unlock() on success.
    // If it fails, error is set in context and displayed below.
    setIsUnlocking(false)
  }

  return (
    <div style={{ ...S.screen, justifyContent: 'center' }}>
      {/* Icon */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 48 }}>🔒</div>
        <h1 style={{ ...S.heading, marginTop: 12 }}>Welcome Back</h1>
        <p style={S.subheading}>Enter your password to unlock your wallet.</p>
      </div>

      {/* Password field */}
      <div style={{ marginBottom: 4 }}>
        <label style={S.label} htmlFor="pw">Password</label>
        <input
          id="pw"
          type="password"
          placeholder="Your wallet password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
          style={S.input}
          autoFocus
          autoComplete="current-password"
        />
      </div>

      {/* Error from context (wrong password, etc.) */}
      {error && <p style={S.errorText}>{error}</p>}

      {/* Unlock button */}
      <button
        onClick={handleUnlock}
        disabled={isUnlocking || !password}
        style={{
          ...S.btnPrimary,
          marginTop: 16,
          opacity: isUnlocking || !password ? 0.6 : 1,
          cursor: isUnlocking || !password ? 'not-allowed' : 'pointer',
        }}
      >
        {isUnlocking ? 'Unlocking…' : 'Unlock'}
      </button>

      {/* Escape hatch: if user has forgotten their password they must
          re-import using their seed phrase. Clearing the vault is handled
          inside onboarding when they create/import a new one. */}
      <button
        onClick={() => navigate('onboarding')}
        style={{ ...S.btnSecondary, marginTop: 10 }}
      >
        Forgot Password / New Wallet
      </button>
    </div>
  )
}
