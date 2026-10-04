import { useRef } from 'react'
import { Heart, Minus, Plus, ShoppingCart, Star, X } from 'lucide-react'
import { type Copy } from './i18n'
import type { Cart } from './api/contracts'
import type { ProductView } from './api/view'
import { stockLabel } from './api/view'
import { useDismissable } from './components/hooks'

export function PriceTicker({ items, label }: { items: ProductView[]; label: string }) {
  if (items.length === 0) return null
  // Rendered twice so the -50% loop is seamless; the copy is hidden from AT.
  const doubled = [...items, ...items]
  return <div className="ticker" role="region" aria-label={label}>
    <div className="ticker-label"><span>{label}</span></div>
    <div className="ticker-track">
      <div className="ticker-move">
        {doubled.map((item, i) => <span className="ticker-item" key={`${item.id}-${i}`} aria-hidden={i >= items.length || undefined}>
          {item.name}<em>{item.price}</em>
        </span>)}
      </div>
    </div>
  </div>
}

/**
 * Product tile: 4:3 media with sale/stock badges, brand and category tags,
 * then name, rating, price, stock and the add-to-cart action pinned to the
 * bottom so a row of cards lines up whatever the name length.
 */
export function ProductCard({ product, t, wishlisted, onWishlist, onCart, onOpen }: {
  product: ProductView; t: Copy; wishlisted: boolean; onWishlist: () => void; onCart: () => void; onOpen: () => void
}) {
  const soldOut = product.stockSignal === 'out_of_stock'
  return <article className="product-card">
    <button type="button" className="product-media" onClick={onOpen} tabIndex={-1} aria-hidden>
      {product.image
        ? <img src={product.image} alt="" loading="lazy" decoding="async" width={400} height={300}/>
        : <span className="photo-fallback">{product.name.slice(0, 1)}</span>}
    </button>
    <div className="badges">
      {product.discountPercent ? <span className="badge badge-sale">−{product.discountPercent}%</span> : null}
      {soldOut && <span className="badge badge-out">{t.stock.outOfStock}</span>}
    </div>
    <button type="button" className={wishlisted ? 'wish active' : 'wish'} onClick={onWishlist}
      aria-label={t.wishlist} aria-pressed={wishlisted}>
      <Heart size={18} fill={wishlisted ? 'currentColor' : 'none'} aria-hidden/>
    </button>
    <div className="product-body">
      <div className="tags">
        {product.brand && <span className="tag tag-brand">{product.brand}</span>}
        {product.categoryName && <span className="tag tag-cat">{product.categoryName}</span>}
      </div>
      <h3 className="product-title"><button type="button" onClick={onOpen}>{product.name}</button></h3>
      <div className="rating">
        <Star size={13} fill="currentColor" aria-hidden/>
        {product.reviews > 0 ? <><b>{product.rating.toFixed(1)}</b> <span>({product.reviews})</span></> : <span>{t.noReviews}</span>}
      </div>
      <div className="price"><b>{product.price}</b>{product.originalPrice ? <del>{product.originalPrice}</del> : null}</div>
      <p className={soldOut ? 'stock out' : 'stock'}>● {stockLabel(product.stockSignal, t.stock)}</p>
      <button type="button" className="btn btn-outline btn-block" onClick={onCart} disabled={soldOut}>
        <ShoppingCart size={16} aria-hidden/> {soldOut ? t.stock.outOfStock : t.addCart}
      </button>
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
  const ref = useRef<HTMLElement>(null)
  useDismissable(true, onClose, ref)
  const lines = cart?.sellers.flatMap(seller => seller.items) ?? []
  return <>
    <div className="backdrop" onClick={onClose}/>
    <aside ref={ref} className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title">
      <div className="drawer-head">
        <div><span className="eyebrow">{t.yourOrder}</span><h2 id="cart-title">{t.cartTitle} ({cart?.itemCount ?? 0})</h2></div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label={t.close}><X/></button>
      </div>
      {lines.length ? <>
        <div className="cart-lines">{cart!.sellers.map(seller => <div key={seller.sellerOrganisationId}>
          {cart!.sellers.length > 1 && <p className="cart-seller">{seller.sellerName}</p>}
          {seller.items.map(item => <article key={item.id} className={busyItemId === item.id ? 'is-busy' : undefined}>
            {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" width={64} height={64}/> : <span className="photo-fallback small" aria-hidden>{item.name.slice(0, 1)}</span>}
            <div>
              <b>{item.name}</b>
              <small>{item.unitPrice.display}{item.unitCode ? ` · ${item.unitCode}` : ''}</small>
              {item.priceChanged && <small className="warn">{t.priceMoved}</small>}
              <div className="quantity">
                <button type="button" onClick={() => item.quantity <= 1 ? onRemove(item.id) : onQty(item.id, item.quantity - 1)} disabled={busyItemId === item.id} aria-label={t.less}><Minus size={14}/></button>
                <span aria-live="polite">{item.quantity}</span>
                <button type="button" onClick={() => onQty(item.id, item.quantity + 1)} disabled={busyItemId === item.id} aria-label={t.more}><Plus size={14}/></button>
              </div>
            </div>
            <strong>{item.lineTotal.display}</strong>
          </article>)}
        </div>)}</div>
        <div className="cart-total">
          <span>{t.subtotal}</span><b>{cart!.subtotal.display}</b>
          {cart!.discountTotal.amountMinor > 0 && <><span>{t.discount}</span><b>−{cart!.discountTotal.display}</b></>}
          <small>{t.delNote}</small>
          <button type="button" className="btn btn-primary" onClick={onCheckout}>{t.checkout}</button>
        </div>
      </> : <div className="cart-empty"><ShoppingCart size={34} aria-hidden/><b>{t.cartEmptyH}</b><p>{t.cartEmptyP}</p><button type="button" className="btn btn-primary" onClick={onShop}>{t.browseP}</button></div>}
    </aside>
  </>
}

/** Page title block. A <div>, not <header>: see the catalog note in styles.css. */
export function PageHero({ kicker, title, note }: { kicker: string; title: string; note: string }) {
  return <div className="page-hero">
    <span className="eyebrow">{kicker}</span>
    <h1>{title}</h1>
    <p>{note}</p>
  </div>
}

export function pad(n: number) { return String(n).padStart(2, '0') }
