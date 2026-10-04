import type { Copy } from '../i18n'
import { BrandLogo } from './BrandLogo'

/** Footer: same five links as before, laid out as brand column + link grid. */
export function SiteFooter({ t, onHome, links }: {
  t: Copy
  onHome: () => void
  links: [string, () => void][]
}) {
  return <footer className="site-footer on-dark">
    <div className="container footer-grid">
      <div>
        <BrandLogo onClick={onHome} light/>
        <p>{t.brandP}</p>
      </div>
      <nav className="foot-links" aria-label="Footer">
        {links.map(([label, onClick]) => <button key={label} type="button" onClick={onClick}>{label}</button>)}
      </nav>
    </div>
    <div className="container footer-base">{t.copyright}</div>
  </footer>
}
