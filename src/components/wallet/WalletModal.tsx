import { useEffect, useRef, type ReactNode } from 'react'
import './WalletModal.css'

type WalletModalProps = {
  title: string
  onClose: () => void
  children: ReactNode
}

// A minimally accessible dialog: traps focus inside on open, restores focus
// to whatever triggered it on close, and closes on Escape or backdrop click.
export function WalletModal({ title, onClose, children }: WalletModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const triggerElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    triggerElement.current = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      triggerElement.current?.focus()
    }
  }, [onClose])

  return (
    <div className="qd-modal__backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        className="qd-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qd-modal-title"
        tabIndex={-1}
      >
        <div className="qd-modal__header">
          <h3 id="qd-modal-title" className="qd-modal__title">{title}</h3>
          <button type="button" className="qd-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="qd-modal__body">{children}</div>
      </div>
    </div>
  )
}
