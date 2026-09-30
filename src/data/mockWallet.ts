// Realistic mock data for the marketing/demo experience. Nothing here reads
// from or writes to a real chain — this is presentation data only. Amounts
// are illustrative, not fetched balances.

export type Asset = {
  symbol: string
  name: string
  amount: string
  fiatValue: string
  changePct: string
}

export type MockAccount = {
  id: string
  name: string
  address: string
  assets: Asset[]
}

export const mockAccounts: MockAccount[] = [
  {
    id: 'personal',
    name: 'Personal',
    address: '0x4E7A3f9C1b2D8e6F0a5C4b3D2e1F0a9B8c7D6E21',
    assets: [
      { symbol: 'ETH', name: 'Ethereum', amount: '2.8400 ETH', fiatValue: '$8,421.32', changePct: '+2.84%' },
      { symbol: 'QD', name: 'QD Token', amount: '420.00 QD', fiatValue: '$2,940.00', changePct: '+18.4%' },
      { symbol: 'USDC', name: 'USD Coin', amount: '1,200.00 USDC', fiatValue: '$1,200.00', changePct: '0.00%' },
    ],
  },
  {
    id: 'savings',
    name: 'Savings',
    address: '0x9C1a2B3d4E5f6071829304a5B6c7D8e9F0a1B2C3',
    assets: [
      { symbol: 'ETH', name: 'Ethereum', amount: '1.2100 ETH', fiatValue: '$3,584.60', changePct: '+2.84%' },
      { symbol: 'USDC', name: 'USD Coin', amount: '5,000.00 USDC', fiatValue: '$5,000.00', changePct: '0.00%' },
    ],
  },
  {
    id: 'defi',
    name: 'DeFi',
    address: '0x1D2e3F405162738495a6B7c8D9e0F1a2B3c4D5e6',
    assets: [
      { symbol: 'ETH', name: 'Ethereum', amount: '0.6400 ETH', fiatValue: '$1,897.30', changePct: '+2.84%' },
      { symbol: 'USDC', name: 'USD Coin', amount: '812.00 USDC', fiatValue: '$812.00', changePct: '0.00%' },
    ],
  },
]

// A tiny illustrative conversion table for the mock swap flow — not a real
// price feed.
export const mockRates: Record<string, number> = {
  ETH: 2965.25,
  QD: 7.0,
  USDC: 1,
}

export type ThresholdParticipant = {
  id: string
  label: string
  description: string
  status: 'approved' | 'waiting'
}

export const thresholdParticipants: ThresholdParticipant[] = [
  { id: 'a', label: 'Participant A', description: 'Secure device enclave', status: 'approved' },
  { id: 'b', label: 'Participant B', description: 'Physical approval key', status: 'approved' },
  { id: 'c', label: 'Participant C', description: 'Recovery co-signer', status: 'waiting' },
]

export const thresholdRequired = 2
export const thresholdTotal = 3

export type ActivityEvent = {
  id: string
  kind: 'received' | 'sent' | 'swapped'
  summary: string
  counterparty: string
  amount: string
  time: string
}

export const mockActivity: ActivityEvent[] = [
  { id: '1', kind: 'received', summary: 'Received ETH', counterparty: '0x4B3…1A90', amount: '+0.8400 ETH', time: 'Today, 14:23' },
  { id: '2', kind: 'sent', summary: 'Sent ETH', counterparty: '0x71C…92A4', amount: '-0.4200 ETH', time: 'Today, 11:05' },
  { id: '3', kind: 'swapped', summary: 'Swapped ETH → USDC', counterparty: 'Internal swap', amount: '1,200.00 USDC', time: 'Yesterday, 19:42' },
]

export type PendingTransaction = {
  recipient: string
  amountEth: string
  fiatValue: string
  estimatedGas: string
}

export const mockPendingTransaction: PendingTransaction = {
  recipient: '0x71C…92A4',
  amountEth: '0.4200 ETH',
  fiatValue: '$1,245.80',
  estimatedGas: '$0.84',
}
