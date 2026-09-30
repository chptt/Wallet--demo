// src/core/sendTransaction.ts
//
// All transaction logic lives here, completely separate from the UI.
// The UI layer only calls sendTransaction() and reacts to the result.
//
// WHAT HAPPENS WHEN YOU SEND ETH:
//
//   1. Validate inputs locally (address format, amount, sufficient balance).
//   2. Connect the wallet to a provider so it can talk to the network.
//   3. Estimate gas — the network tells us how much computational work
//      the transaction requires and what the current fee rate is.
//   4. Sign + broadcast — ethers serialises the transaction, signs it
//      with the private key, and sends the raw bytes to the node.
//   5. Wait for confirmation — the node returns a tx hash immediately,
//      but the transaction isn't final until a block includes it.
//      We wait for 1 confirmation before reporting success.

import {
  isAddress,
  parseEther,
  formatEther,
  JsonRpcProvider,
  type Wallet,
  type TransactionResponse,
  type TransactionReceipt,
} from 'ethers'

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export type SendParams = {
  to: string        // recipient address (0x...)
  amountEth: string // amount as a decimal string, e.g. "0.01"
  rpcUrl: string    // the selected network's RPC endpoint
  chainId: number   // the selected network's chain ID (used for EIP-155 signing)
}

// Returned by estimateGasFee() — the UI shows this to the user before confirm.
export type GasEstimate = {
  gasCostEth: string  // estimated fee in ETH, e.g. "0.000042"
  gasCostWei: bigint  // same value in wei (for internal calculations)
  gasLimit: bigint    // units of gas the transaction is expected to use
  gasPriceWei: bigint // current fee per gas unit in wei (from the network)
}

// Returned by sendTransaction() on success.
export type TxResult = {
  hash: string           // transaction hash — can be looked up on Etherscan
  receipt: TransactionReceipt // full receipt once confirmed (includes block number)
}

// A structured error we throw so the UI can show a meaningful message.
export class SendError extends Error {
  readonly code:
    | 'INVALID_ADDRESS'
    | 'INVALID_AMOUNT'
    | 'INSUFFICIENT_BALANCE'
    | 'GAS_ESTIMATION_FAILED'
    | 'BROADCAST_FAILED'
    | 'CONFIRMATION_FAILED'

  constructor(
    message: string,
    code: typeof SendError.prototype.code
  ) {
    super(message)
    this.name = 'SendError'
    this.code = code
  }
}

// --------------------------------------------------------------------------
// Input validation
// --------------------------------------------------------------------------

/**
 * Validates the recipient address and amount before touching the network.
 * Throws SendError with a descriptive code so the UI can highlight the
 * right field.
 *
 * @param balanceEth  The sender's current balance as a string (from context).
 */
export function validateSendInputs(
  to: string,
  amountEth: string,
  balanceEth: string | null
): void {
  // isAddress checks the format (0x + 40 hex chars) and validates
  // the EIP-55 checksum if present. It returns false for ENS names —
  // we don't support ENS resolution yet.
  if (!isAddress(to)) {
    throw new SendError(
      'Invalid recipient address. Must be a 0x Ethereum address.',
      'INVALID_ADDRESS'
    )
  }

  const amount = parseFloat(amountEth)

  if (isNaN(amount) || amount <= 0) {
    throw new SendError(
      'Amount must be a positive number.',
      'INVALID_AMOUNT'
    )
  }

  // parseEther converts the decimal string to wei (BigInt).
  // It throws if the string has too many decimal places (> 18).
  let amountWei: bigint
  try {
    amountWei = parseEther(amountEth)
  } catch {
    throw new SendError('Invalid amount format.', 'INVALID_AMOUNT')
  }

  // Check the sender has enough ETH.
  // We compare in wei to avoid floating-point rounding errors.
  if (balanceEth !== null) {
    const balanceWei = parseEther(balanceEth)
    if (amountWei > balanceWei) {
      throw new SendError(
        `Insufficient balance. You have ${parseFloat(balanceEth).toFixed(6)} ETH.`,
        'INSUFFICIENT_BALANCE'
      )
    }
  }
}

// --------------------------------------------------------------------------
// Gas estimation
// --------------------------------------------------------------------------

/**
 * Asks the network to estimate how much gas this transfer will use,
 * then looks up the current gas price to compute the total fee in ETH.
 *
 * WHY ESTIMATE GAS?
 *   Every transaction on Ethereum consumes "gas" — a unit of computation.
 *   A simple ETH transfer always uses exactly 21,000 gas.
 *   The fee you pay = gas used × gas price (in wei per gas unit).
 *   Gas price fluctuates with network congestion.
 *
 * We add a 20% buffer to the gas limit so the transaction doesn't run
 * out of gas if the network estimates slightly low.
 */
export async function estimateGasFee(
  params: SendParams,
  wallet: Wallet
): Promise<GasEstimate> {
  const provider = new JsonRpcProvider(params.rpcUrl)

  let gasLimit: bigint
  let feeData: Awaited<ReturnType<typeof provider.getFeeData>>

  try {
    // estimateGas simulates the transaction and returns the gas units needed.
    // We pass the full tx object so the estimate is accurate.
    gasLimit = await provider.estimateGas({
      from: wallet.address,
      to: params.to,
      value: parseEther(params.amountEth),
    })

    // getFeeData returns maxFeePerGas / maxPriorityFeePerGas (EIP-1559)
    // or gasPrice (legacy). We use gasPrice for simplicity here.
    feeData = await provider.getFeeData()
  } catch (err) {
    throw new SendError(
      'Could not estimate gas. The network may be unavailable.',
      'GAS_ESTIMATION_FAILED'
    )
  }

  // Use EIP-1559 maxFeePerGas if available, fall back to legacy gasPrice.
  // Both represent the maximum price we're willing to pay per gas unit.
  const gasPriceWei = feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n

  // Add a 20% buffer to the gas limit as a safety margin.
  // (gasLimit * 120n) / 100n is integer arithmetic — no floating point.
  const gasLimitBuffered = (gasLimit * 120n) / 100n

  const gasCostWei = gasLimitBuffered * gasPriceWei

  return {
    gasCostEth: formatEther(gasCostWei),
    gasCostWei,
    gasLimit: gasLimitBuffered,
    gasPriceWei,
  }
}

// --------------------------------------------------------------------------
// Send transaction
// --------------------------------------------------------------------------

/**
 * Signs and broadcasts the transaction, then waits for 1 confirmation.
 *
 * Returns TxResult with the hash and receipt once the tx is mined.
 *
 * WHAT HAPPENS INTERNALLY:
 *   1. wallet.connect(provider) — attaches the signing wallet to the node.
 *   2. wallet.sendTransaction() — ethers:
 *        a. Fetches the sender's nonce (tx count, prevents replay attacks).
 *        b. Builds the transaction object (to, value, gasLimit, chainId…).
 *        c. Signs it with the private key using secp256k1 ECDSA.
 *        d. Serialises to RLP-encoded bytes and sends via eth_sendRawTransaction.
 *   3. tx.wait(1) — polls eth_getTransactionReceipt until the tx appears
 *      in a block (1 confirmation = included in the next block).
 */
export async function sendTransaction(
  params: SendParams,
  wallet: Wallet,
  gasEstimate: GasEstimate
): Promise<TxResult> {
  const provider = new JsonRpcProvider(params.rpcUrl)

  // Connect the wallet to the provider.
  // The wallet alone can only sign; the provider is needed to broadcast.
  const connectedWallet = wallet.connect(provider)

  let tx: TransactionResponse
  try {
    tx = await connectedWallet.sendTransaction({
      to: params.to,
      value: parseEther(params.amountEth),
      gasLimit: gasEstimate.gasLimit,
      // If the network supports EIP-1559, maxFeePerGas sets the ceiling.
      // Otherwise ethers falls back to setting gasPrice.
      maxFeePerGas: gasEstimate.gasPriceWei > 0n ? gasEstimate.gasPriceWei : undefined,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    throw new SendError(`Transaction failed: ${msg}`, 'BROADCAST_FAILED')
  }

  // Wait for the transaction to be included in a block.
  // tx.wait(1) returns the receipt once 1 block has confirmed the tx.
  // This can take 12–30 seconds on mainnet, faster on testnets.
  let receipt: TransactionReceipt | null
  try {
    receipt = await tx.wait(1)
  } catch (err) {
    throw new SendError(
      'Transaction was sent but confirmation failed. Check the tx hash on Etherscan.',
      'CONFIRMATION_FAILED'
    )
  }

  if (!receipt) {
    throw new SendError('No receipt returned after confirmation.', 'CONFIRMATION_FAILED')
  }

  return { hash: tx.hash, receipt }
}
