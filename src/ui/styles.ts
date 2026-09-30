// src/ui/styles.ts
//
// Shared style constants used across all screens.
// Using plain JS objects (React inline styles) keeps things simple —
// no CSS files to import, no class name collisions, no build config.
//
// The popup window is fixed at 360×580px, matching MetaMask's dimensions.

import type { CSSProperties } from 'react'

// ── Colour palette ──────────────────────────────────────────────────────────
export const colors = {
  bg: '#1a1b1e',
  surface: '#25262b',
  border: '#373a40',
  primary: '#7c3aed',
  primaryHover: '#6d28d9',
  danger: '#ef4444',
  success: '#22c55e',
  textPrimary: '#f1f3f5',
  textSecondary: '#868e96',
  testnet: '#f59e0b',   // amber — testnets
  local: '#06b6d4',     // cyan — local dev node (Anvil/Hardhat)
}

// ── Shared layout ───────────────────────────────────────────────────────────
export const screen: CSSProperties = {
  width: 360,
  minHeight: 580,
  backgroundColor: colors.bg,
  color: colors.textPrimary,
  fontFamily: "'Segoe UI', system-ui, sans-serif",
  fontSize: 14,
  display: 'flex',
  flexDirection: 'column',
  padding: '24px 20px',
  boxSizing: 'border-box',
}

// ── Typography ───────────────────────────────────────────────────────────────
export const heading: CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  margin: '0 0 6px',
  color: colors.textPrimary,
}

export const subheading: CSSProperties = {
  fontSize: 13,
  color: colors.textSecondary,
  margin: '0 0 24px',
  lineHeight: 1.5,
}

// ── Form elements ────────────────────────────────────────────────────────────
export const label: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: colors.textSecondary,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 6,
  display: 'block',
}

export const input: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  backgroundColor: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  color: colors.textPrimary,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
}

export const textarea: CSSProperties = {
  ...input,
  resize: 'vertical',
  minHeight: 80,
  fontFamily: 'monospace',
  fontSize: 13,
}

// ── Buttons ───────────────────────────────────────────────────────────────────
export const btnPrimary: CSSProperties = {
  width: '100%',
  padding: '12px',
  backgroundColor: colors.primary,
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
  marginTop: 8,
}

export const btnSecondary: CSSProperties = {
  ...btnPrimary,
  backgroundColor: 'transparent',
  border: `1px solid ${colors.border}`,
  color: colors.textPrimary,
}

export const btnDanger: CSSProperties = {
  ...btnPrimary,
  backgroundColor: colors.danger,
}

// ── Miscellaneous ─────────────────────────────────────────────────────────────
export const errorText: CSSProperties = {
  color: colors.danger,
  fontSize: 13,
  marginTop: 8,
}

export const card: CSSProperties = {
  backgroundColor: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  padding: '14px 16px',
}

export const divider: CSSProperties = {
  border: 'none',
  borderTop: `1px solid ${colors.border}`,
  margin: '20px 0',
}

export const spacer = (px: number): CSSProperties => ({ height: px })
