import { useMemo, useState } from 'react'
import type { MockAccount } from '@data/mockWallet'
import { mockRates } from '@data/mockWallet'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import './SwapFlow.css'

export function SwapFlow({ account }: { account: MockAccount }) {
  const symbols = account.assets.map((a) => a.symbol)
  const [fromSymbol, setFromSymbol] = useState(symbols[0])
  const [toSymbol, setToSymbol] = useState(symbols.find((s) => s !== symbols[0]) ?? symbols[0])
  const [amount, setAmount] = useState('')
  const [done, setDone] = useState(false)

  const parsedAmount = parseFloat(amount)
  const output = useMemo(() => {
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) return null
    const fromRate = mockRates[fromSymbol] ?? 1
    const toRate = mockRates[toSymbol] ?? 1
    return (parsedAmount * fromRate) / toRate
  }, [parsedAmount, fromSymbol, toSymbol])

  if (done) {
    return (
      <div className="qd-swap-flow__success">
        <p className="qd-swap-flow__success-badge">Swap complete</p>
        <p>{parsedAmount.toFixed(4)} {fromSymbol} → {output?.toFixed(4)} {toSymbol}</p>
        <p className="qd-swap-flow__note">Simulated only — no real swap was executed.</p>
      </div>
    )
  }

  return (
    <div className="qd-swap-flow">
      <div className="qd-swap-flow__pair">
        <label className="qd-swap-flow__select-label">
          From
          <select value={fromSymbol} onChange={(e) => setFromSymbol(e.target.value)} className="qd-swap-flow__select">
            {symbols.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="qd-swap-flow__select-label">
          To
          <select value={toSymbol} onChange={(e) => setToSymbol(e.target.value)} className="qd-swap-flow__select">
            {symbols.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>

      <Field
        label={`Amount (${fromSymbol})`}
        placeholder="0.00"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <p className="qd-swap-flow__rate">
        {output !== null ? `≈ ${output.toFixed(4)} ${toSymbol}` : 'Enter an amount to see the estimate'}
      </p>

      <div className="qd-swap-flow__actions">
        <Button variant="primary" disabled={output === null || fromSymbol === toSymbol} onClick={() => setDone(true)}>
          Swap
        </Button>
      </div>
    </div>
  )
}
