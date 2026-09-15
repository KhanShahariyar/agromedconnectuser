import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Heart, Minus, Plus, ShoppingCart, Star, X } from 'lucide-react'
import { type Copy } from './i18n'
import type { Cart } from './api/contracts'
import type { ProductView } from './api/view'
import { stockLabel } from './api/view'

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

export function PriceTicker({ items, label }: { items: ProductView[]; label: string }) {

  if (items.length === 0) return null

  const doubled = [...items, ...items]
  return <div className="ticker">
    <div className="ticker-label"><span>{label}</span></div>
    <div className="ticker-track">
      <div className="ticker-move">
        {doubled.map((item, i) => <span className="ticker-item" key={`${item.id}-${i}`}>
          <b>{item.name}</b><em>{item.price}</em>
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

export function ProductCard({ product, t, wishlisted, onWishlist, onCart, onOpen, index }: {
  product: ProductView; t: Copy; wishlisted: boolean; onWishlist: () => void; onCart: () => void; onOpen: () => void; index: number
}) {
  const [loaded, setLoaded] = useState(false)
  const cardRef = useRef<HTMLElement>(null)
  const onMove = (e: React.MouseEvent) => {
    const el = cardRef.current; if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--ry', `${((e.clientX - rect.left) / rect.width - 0.5) * 7}deg`)
    el.style.setProperty('--rx', `${((e.clientY - rect.top) / rect.height - 0.5) * -7}deg`)
  }
  const soldOut = product.stockSignal === 'out_of_stock'
  return <article ref={cardRef} className="product-card reveal tilt" style={{ transitionDelay: `${Math.min(index, 8) * 50}ms` }} onMouseMove={onMove} onMouseLeave={() => { const el = cardRef.current; if (el) { el.style.setProperty('--ry', '0deg'); el.style.setProperty('--rx', '0deg') } }}>
    <button className={loaded ? 'product-photo loaded' : 'product-photo'} onClick={onOpen}>
      {
}
      {product.image
        ? <img src={product.image} alt={product.name} loading="lazy" onLoad={() => setLoaded(true)} onError={() => setLoaded(true)}/>
        : <span className="photo-fallback" aria-hidden>{product.name.slice(0, 1)}</span>}
      {product.discountPercent ? <span className="badge-sale">−{product.discountPercent}%</span> : null}
    </button>
    <button className={wishlisted ? 'wish active' : 'wish'} onClick={onWishlist} aria-label={t.wishlist}><Heart size={16} fill={wishlisted ? 'currentColor' : 'none'}/></button>
    <div className="product-info">
      <small>{product.brand || product.categoryName}</small>
      <h3><button onClick={onOpen}>{product.name}</button></h3>
      <div className="rating">
        <Star size={12} fill="currentColor"/>
        {
}
        {product.reviews > 0 ? <><b>{product.rating.toFixed(1)}</b> <span>({product.reviews})</span></> : <span>{t.noReviews}</span>}
      </div>
      <div className="price"><b>{product.price}</b>{product.originalPrice ? <del>{product.originalPrice}</del> : null}</div>
      <p className={soldOut ? 'stock out' : 'stock'}>● {stockLabel(product.stockSignal, t.stock)}</p>
      <button className="add-cart" onClick={onCart} disabled={soldOut}><ShoppingCart size={15}/> {soldOut ? t.stock.outOfStock : t.addCart}</button>
    </div>
  </article>
}

export function CartDrawer({ cart, busyItemId, t, onClose, onQty, onRemove, onCheckout, onShop }: {
  cart: Cart | undefined

  busyItemId: string | null
  t: Copy
  onClose: () => void
  onQty: (itemId: string, quantity: number) => void
  onRemove: (itemId: string) => void
  onCheckout: () => void
  onShop: () => void
}) {
  const lines = cart?.sellers.flatMap(seller => seller.items) ?? []
  return <>
    <div className="drawer-backdrop" onClick={onClose}/>
    <aside className="cart-drawer">
      <div className="drawer-head">
        <div><small>{t.yourOrder}</small><h2>{t.cartTitle} ({cart?.itemCount ?? 0})</h2></div>
        <button onClick={onClose} aria-label={t.close}><X/></button>
      </div>
      {lines.length ? <>
        <div className="cart-lines">{cart!.sellers.map(seller => <div key={seller.sellerOrganisationId}>
          {
}
          {cart!.sellers.length > 1 && <p className="cart-seller">{seller.sellerName}</p>}
          {seller.items.map(item => <article key={item.id} className={busyItemId === item.id ? 'is-busy' : undefined}>
            {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy"/> : <span className="photo-fallback small" aria-hidden>{item.name.slice(0, 1)}</span>}
            <div>
              <b>{item.name}</b>
              <small>{item.unitPrice.display}{item.unitCode ? ` · ${item.unitCode}` : ''}</small>
              {item.priceChanged && <small className="warn">{t.priceMoved}</small>}
              <div className="quantity">
                <button onClick={() => item.quantity <= 1 ? onRemove(item.id) : onQty(item.id, item.quantity - 1)} disabled={busyItemId === item.id} aria-label={t.less}><Minus size={13}/></button>
                <span>{item.quantity}</span>
                <button onClick={() => onQty(item.id, item.quantity + 1)} disabled={busyItemId === item.id} aria-label={t.more}><Plus size={13}/></button>
              </div>
            </div>
            <strong>{item.lineTotal.display}</strong>
          </article>)}
        </div>)}</div>
        <div className="cart-total">
          <span>{t.subtotal}</span><b>{cart!.subtotal.display}</b>
          {cart!.discountTotal.amountMinor > 0 && <><span>{t.discount}</span><b>−{cart!.discountTotal.display}</b></>}
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
