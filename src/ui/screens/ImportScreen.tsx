// src/ui/screens/ImportScreen.tsx
//
// Lets a returning user restore their wallet by entering their
// existing 12-word seed phrase and setting a new password.
//
// FROM HERE:
//   → valid mnemonic + password → importWallet() → UnlockScreen
//   → back button → OnboardingScreen

import { useState } from 'react'
import { useWallet } from '@state'
import * as S from '../styles.ts'

export function ImportScreen() {
  const { importWallet, navigate, error } = useWallet()
  const [phrase, setPhrase] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [localError, setLocalError] = useState('')
  const [isImporting, setIsImporting] = useState(false)

  async function handleImport() {
    setLocalError('')

    const wordCount = phrase.trim().split(/\s+/).length
    if (wordCount !== 12 && wordCount !== 24) {
      setLocalError('Seed phrase must be 12 or 24 words.')
      return
    }
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setLocalError('Passwords do not match.')
      return
    }

    setIsImporting(true)
    await importWallet(phrase, password)
    // Navigation to 'unlock' is handled inside importWallet()
    setIsImporting(false)
  }

  return (
    <div style={S.screen}>
      {/* Back navigation */}
      <button
        onClick={() => navigate('onboarding')}
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

      <h1 style={S.heading}>Import Wallet</h1>
      <p style={S.subheading}>
        Enter your 12 or 24-word seed phrase and choose a new password for this device.
      </p>

      {/* Seed phrase input */}
      <div style={{ marginBottom: 12 }}>
        <label style={S.label} htmlFor="phrase">Seed Phrase</label>
        <textarea
          id="phrase"
          placeholder="word1 word2 word3 … word12"
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          style={{ ...S.textarea, minHeight: 96 }}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      </div>

      {/* New password */}
      <div style={{ marginBottom: 12 }}>
        <label style={S.label} htmlFor="pw">New Password</label>
        <input
          id="pw"
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={S.input}
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
          onKeyDown={(e) => e.key === 'Enter' && handleImport()}
        />
      </div>

      {(localError || error) && (
        <p style={S.errorText}>{localError || error}</p>
      )}

      <button
        onClick={handleImport}
        disabled={isImporting}
        style={{ ...S.btnPrimary, marginTop: 16, opacity: isImporting ? 0.7 : 1 }}
      >
        {isImporting ? 'Importing…' : 'Import Wallet'}
      </button>
    </div>
  )
}
