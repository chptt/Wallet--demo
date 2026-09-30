// src/state/networks.ts
//
// Static definitions for every network the wallet supports.
// To add a new network later, just append an entry to NETWORKS.

export type Network = {
  chainId: number
  rpcUrl: string
  name: string
  currency: string
  explorerUrl: string
  testnet: boolean
  local: boolean    // true = local dev node (Anvil, Hardhat, Ganache)
}

export const NETWORKS: Network[] = [
  {
    chainId: 1,
    rpcUrl: 'https://cloudflare-eth.com',
    name: 'Ethereum Mainnet',
    currency: 'ETH',
    explorerUrl: 'https://etherscan.io',
    testnet: false,
    local: false,
  },
  {
    chainId: 11155111,
    rpcUrl: 'https://rpc.sepolia.org',
    name: 'Sepolia Testnet',
    currency: 'ETH',
    explorerUrl: 'https://sepolia.etherscan.io',
    testnet: true,
    local: false,
  },
  {
    // Anvil (and Hardhat) both default to chainId 31337.
    // RPC runs on localhost:8545 — start it with:  anvil
    // or with Hardhat:  npx hardhat node
    //
    // IMPORTANT: http:// (not https://) — this is a local plaintext connection.
    // Chrome extensions CAN make requests to http://127.0.0.1 — it is treated
    // as a secure context because it's loopback.
    chainId: 31337,
    rpcUrl: 'http://127.0.0.1:8545',
    name: 'Anvil Local',
    currency: 'ETH',
    explorerUrl: '',   // no block explorer for local dev nodes
    testnet: false,
    local: true,
  },
]

// The network shown when the wallet first opens.
export const DEFAULT_NETWORK = NETWORKS[0]
