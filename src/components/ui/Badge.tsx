import type { ReactNode } from 'react'
import './Badge.css'

type BadgeProps = {
  tone?: 'neutral' | 'approved' | 'waiting'
  children: ReactNode
}

export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return (
    <span className={`qd-badge qd-badge--${tone}`}>
      <span className="qd-badge__dot" aria-hidden="true" />
      {children}
    </span>
  )
}
