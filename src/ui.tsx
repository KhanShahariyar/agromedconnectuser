import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Heart, Minus, Plus, ShoppingCart, Star, TrendingDown, TrendingUp, X } from 'lucide-react'
import { tickerRow, type Product } from './data'
import { type Copy } from './i18n'

export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let x = window.innerWidth / 2, y = window.innerHeight / 2, tx = x, ty = y, raf = 0
    const onMove = (e: MouseEvent) => { tx = e.clientX; ty = e.clientY }
    const loop = () => {
      x += (tx - x) * 0.12
      y += (ty - y) * 0.12
      el.style.transform = `translate(${x}px, ${y}px)`
      raf = requestAnimationFrame(loop)
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    raf = requestAnimationFrame(loop)
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf) }
  }, [])
  return <div className="cursor-glow" ref={ref} aria-hidden="true"/>
}

export function HeroParticles() {
  const motes = useMemo(() => Array.from({ length: 18 }, (_, i) => ({
    left: `${4 + (i * 4.7) % 92}%`,
    top: `${6 + (i * 11.3) % 84}%`,
    size: 5 + (i % 4) * 3,
    delay: `${(i * 0.41) % 7}s`,
    duration: `${9 + (i % 6) * 1.4}s`,
    kind: i % 3,
  })), [])
  return <div className="hero-particles" aria-hidden="true">
    {motes.map((mote, i) => <span key={i} className={`mote kind-${mote.kind}`} style={{ left: mote.left, top: mote.top, width: mote.size, height: mote.size, animationDelay: mote.delay, animationDuration: mote.duration }}/>)}
  </div>
}

export function SplitHeadline({ text, startDelay = 0 }: { text: string; startDelay?: number }) {
  return <>{text.split(' ').map((word, i) => <span className="split-word" key={i} style={{ animationDelay: `${startDelay + i * 0.05}s` }}>{word}&nbsp;</span>)}</>
}

export function FlipDigit({ value }: { value: string }) {
  const [display, setDisplay] = useState(value)
  const [flip, setFlip] = useState(false)
  const prev = useRef(value)
  useEffect(() => {
    if (prev.current !== value) {
      setFlip(true)
      const t = window.setTimeout(() => { setDisplay(value); setFlip(false) }, 260)
      prev.current = value
      return () => window.clearTimeout(t)
    }
  }, [value])
  return <span className={flip ? 'flip-digit flipping' : 'flip-digit'}>{display}</span>
}

export function PriceTicker({ bn, label }: { bn: boolean; label: string }) {
  const doubled = [...tickerRow, ...tickerRow]
  return <div className="ticker">
    <div className="ticker-label"><span>{label}</span></div>
    <div className="ticker-track">
      <div className="ticker-move">
        {doubled.map((item, i) => <span className="ticker-item" key={i}>
          <b>{bn ? item.labelBn : item.label}</b><em>{bn ? item.priceBn : item.price}</em>
          <i className={item.delta > 0 ? 'up' : item.delta < 0 ? 'down' : 'flat'}>
            {item.delta > 0 ? <TrendingUp size={11}/> : item.delta < 0 ? <TrendingDown size={11}/> : '—'}
            {item.delta !== 0 && `${Math.abs(item.delta)}%`}
          </i>
        </span>)}
      </div>
    </div>
  </div>
}

export function Magnetic({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const ref = useRef<HTMLButtonElement>(null)
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current; if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.transform = `translate(${(e.clientX - rect.left - rect.width / 2) * 0.18}px, ${(e.clientY - rect.top - rect.height / 2) * 0.3}px)`
  }
  return <button ref={ref} className={className} onClick={onClick} onMouseMove={onMove} onMouseLeave={() => { if (ref.current) ref.current.style.transform = 'translate(0,0)' }}>{children}</button>
}

export function ProductCard({ product, bn, t, wishlisted, onWishlist, onCart, onOpen, index }: {
  product: Product; bn: boolean; t: Copy; wishlisted: boolean; onWishlist: () => void; onCart: () => void; onOpen: () => void; index: number
}) {
  const [loaded, setLoaded] = useState(false)
  const cardRef = useRef<HTMLElement>(null)
  const onMove = (e: React.MouseEvent) => {
    const el = cardRef.current; if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--ry', `${((e.clientX - rect.left) / rect.width - 0.5) * 7}deg`)
    el.style.setProperty('--rx', `${((e.clientY - rect.top) / rect.height - 0.5) * -7}deg`)
  }
  return <article ref={cardRef} className="product-card reveal tilt" style={{ transitionDelay: `${Math.min(index, 8) * 50}ms` }} onMouseMove={onMove} onMouseLeave={() => { const el = cardRef.current; if (el) { el.style.setProperty('--ry', '0deg'); el.style.setProperty('--rx', '0deg') } }}>
    <button className={loaded ? 'product-photo loaded' : 'product-photo'} onClick={onOpen}>
      <img src={product.image} alt={bn ? product.nameBn : product.name} onLoad={() => setLoaded(true)}/>
      <span style={{ background: product.color }}>{bn ? product.badgeBn : product.badge}</span>
    </button>
    <button className={wishlisted ? 'wish active' : 'wish'} onClick={onWishlist} aria-label={t.wishlist}><Heart size={16} fill={wishlisted ? 'currentColor' : 'none'}/></button>
    <div className="product-info">
      <small>{product.brand} · {bn ? product.unitBn : product.unit}</small>
      <h3><button onClick={onOpen}>{bn ? product.nameBn : product.name}</button></h3>
      <div className="rating"><Star size={12} fill="currentColor"/> <b>{product.rating}</b> <span>({product.reviews})</span></div>
      <div className="price"><b>৳{product.price.toLocaleString()}</b>{product.old ? <del>৳{product.old.toLocaleString()}</del> : null}</div>
      <p className="stock">{product.stock > 20 ? `● ${t.inStock}` : `● ${product.stock} ${t.left}`}</p>
      <button className="add-cart" onClick={onCart}><ShoppingCart size={15}/> {t.addCart}</button>
    </div>
  </article>
}

export function CartDrawer({ items, qty, bn, t, onClose, onQty, onCheckout, onShop }: {
  items: Product[]; qty: Record<string, number>; bn: boolean; t: Copy; onClose: () => void; onQty: (p: Product, n: number) => void; onCheckout: () => void; onShop: () => void
}) {
  const total = items.reduce((s, p) => s + p.price * qty[p.id], 0)
  const count = items.reduce((s, p) => s + qty[p.id], 0)
  return <>
    <div className="drawer-backdrop" onClick={onClose}/>
    <aside className="cart-drawer">
      <div className="drawer-head">
        <div><small>{t.yourOrder}</small><h2>{t.cartTitle} ({count})</h2></div>
        <button onClick={onClose}><X/></button>
      </div>
      {items.length ? <>
        <div className="cart-lines">{items.map(p => <article key={p.id}>
          <img src={p.image} alt=""/>
          <div>
            <b>{bn ? p.nameBn : p.name}</b>
            <small>৳{p.price.toLocaleString()} · {bn ? p.unitBn : p.unit}</small>
            <div className="quantity">
              <button onClick={() => onQty(p, -1)}><Minus size={13}/></button>
              <span>{qty[p.id]}</span>
              <button onClick={() => onQty(p, 1)}><Plus size={13}/></button>
            </div>
          </div>
          <strong>৳{(p.price * qty[p.id]).toLocaleString()}</strong>
        </article>)}</div>
        <div className="cart-total">
          <span>{t.subtotal}</span><b>৳{total.toLocaleString()}</b>
          <small>{t.delNote}</small>
          <button onClick={onCheckout}>{t.checkout}</button>
        </div>
      </> : <div className="cart-empty"><ShoppingCart size={34}/><b>{t.cartEmptyH}</b><p>{t.cartEmptyP}</p><button onClick={onShop}>{t.browseP}</button></div>}
    </aside>
  </>
}

export function PageHero({ kicker, title, note }: { kicker: string; title: string; note: string }) {
  return <header className="page-hero reveal">
    <span className="eyebrow">{kicker}</span>
    <h1>{title}</h1>
    <p>{note}</p>
  </header>
}

export function useReveal(dep: unknown) {
  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('in-view'); io.unobserve(entry.target) } })
    }, { threshold: 0.12, rootMargin: '0px 0px -32px 0px' })
    document.querySelectorAll('.reveal:not(.in-view)').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [dep])
}

export function pad(n: number) { return String(n).padStart(2, '0') }
