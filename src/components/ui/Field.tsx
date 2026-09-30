import type { InputHTMLAttributes } from 'react'
import './Field.css'

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}

export function Field({ label, error, id, ...rest }: FieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="qd-field">
      <label htmlFor={fieldId} className="qd-field__label">{label}</label>
      <input id={fieldId} className="qd-field__input" aria-invalid={!!error} {...rest} />
      {error && <p className="qd-field__error" role="alert">{error}</p>}
    </div>
  )
}
