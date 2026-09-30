import type { ReactNode } from 'react'
import './SectionHeading.css'

type SectionHeadingProps = {
  label: string
  title: ReactNode
  description?: string
}

export function SectionHeading({ label, title, description }: SectionHeadingProps) {
  return (
    <header className="qd-section-heading" data-reveal>
      <p className="qd-section-heading__label">{label}</p>
      <h2 className="qd-section-heading__title">{title}</h2>
      {description && <p className="qd-section-heading__description">{description}</p>}
    </header>
  )
}
