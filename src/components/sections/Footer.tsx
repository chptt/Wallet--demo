import { brand } from '@config/brand'
import './Footer.css'

export function Footer() {
  return (
    <footer className="qd-footer">
      <span>{brand.name} © {brand.currentYear}. Prototype build — not financial advice.</span>
      <div className="qd-footer__links">
        <a href="#security">Security concepts</a>
        <a href="#control">Threshold model</a>
        <a href="#wallet">Wallet experience</a>
      </div>
    </footer>
  )
}
