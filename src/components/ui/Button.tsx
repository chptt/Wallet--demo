import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './Button.css'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary'
  children: ReactNode
}

export function Button({ variant = 'primary', className = '', children, ...rest }: ButtonProps) {
  return (
    <button className={`qd-button qd-button--${variant} ${className}`} {...rest}>
      {children}
    </button>
  )
}
