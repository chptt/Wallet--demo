// Centralized brand identity — the final product name is not decided yet.
// Every user-facing surface should read from here instead of hardcoding
// "WALLET" so renaming later is a one-file change.

export const brand = {
  name: 'WALLET',
  nameLower: 'wallet',
  tagline: 'Your assets. Your control. Your future.',
  mascotName: 'Chameleon',
  currentYear: new Date().getFullYear(),
} as const
