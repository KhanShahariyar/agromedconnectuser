import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, ChevronDown, Heart, Menu, Search, ShoppingCart, UserRound, X } from 'lucide-react'
import farmerHero from './assets/farmer-hero.png'
import {
  articles, brands, categories, districts, districtsBn, faqs, farmServices,
  products, sampleNotes, sampleOrders, type Page, type Product,
} from './data'
import { i18n } from './i18n'
import {
  CartDrawer, CursorGlow, FlipDigit, HeroParticles, Magnetic, PageHero,
  PriceTicker, ProductCard, SplitHeadline, pad, useReveal,
} from './ui'

type Lang = 'en' | 'bn'
type Checkout = { name: string; phone: string; district: string; union: string; pay: string; note: string }
type Booked = { id: string; title: string; titleBn: string; fee: number; when: string }
type Placed = { id: string; total: number; pay: string; district: string }
type TrackOrder = { id: string; date: string; dateBn: string; status: string; district: string; total: number; items: string; itemsBn: string }

const navMap: Record<string, Page> = {
  Home: 'home', Shop: 'shop', Categories: 'shop', Brands: 'brands',
  Services: 'services', Offers: 'offers', Knowledge: 'knowledge', Support: 'support',
  হোম: 'home', দোকান: 'shop', ক্যাটাগরি: 'shop', ব্র্যান্ড: 'brands',
  সেবা: 'services', অফার: 'offers', জ্ঞান: 'knowledge', সহায়তা: 'support',
}

export default function App() {
  const [page, setPage] = useState<Page>('home')
  const [lang, setLang] = useState<Lang>('en')
  const [menu, setMenu] = useState(false)
  const [browse, setBrowse] = useState(false)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [category, setCategory] = useState('all')
  const [tab, setTab] = useState('all')
  const [brandFilter, setBrandFilter] = useState('')
  const [productId, setProductId] = useState('p1')
  const [articleId, setArticleId] = useState('a1')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [wishlist, setWishlist] = useState<string[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const [showTop, setShowTop] = useState(false)
  const [progress, setProgress] = useState(0)
  const [bump, setBump] = useState(false)
  const [heroReady, setHeroReady] = useState(false)
  const [faqOpen, setFaqOpen] = useState(0)
  const [trackId, setTrackId] = useState('AMC-24091')
  const [trackHit, setTrackHit] = useState<TrackOrder | null>(sampleOrders[0])
  const [notes, setNotes] = useState(sampleNotes)
  const [bookings, setBookings] = useState<Booked[]>([])
  const [placed, setPlaced] = useState<Placed[]>([])
  const [acctTab, setAcctTab] = useState<'orders' | 'profile' | 'services'>('orders')
  const [profile, setProfile] = useState({ name: 'Rahim Ahmed', phone: '01712-445-890', union: 'Puthia', district: 'Rajshahi' })
  const [checkout, setCheckout] = useState<Checkout>({ name: 'Rahim Ahmed', phone: '01712-445-890', district: 'Rajshahi', union: 'Puthia', pay: 'bKash', note: '' })
  const [orderDone, setOrderDone] = useState<Placed | null>(null)
  const [ticket, setTicket] = useState({ name: 'Rahim Ahmed', topic: 'Delivery', message: '' })
  const [tickets, setTickets] = useState<{ id: string; topic: string }[]>([])
  const [serviceForm, setServiceForm] = useState({ crop: 'Aman paddy', district: 'Rajshahi', phone: '01712-445-890' })
  const heroRef = useRef<HTMLElement>(null)
  const t = i18n[lang]
  const bn = lang === 'bn'
  const distName = (d: string) => bn ? (districtsBn[d] || d) : d

  const go = (next: Page, extra?: () => void) => {
    extra?.()
    setPage(next)
    setMenu(false)
    setBrowse(false)
    setCartOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const showToast = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2400) }

  const visible = useMemo(() => {
    const q = query.toLowerCase()
    return products.filter(p => {
      const text = `${p.name} ${p.nameBn} ${p.brand} ${p.category}`.toLowerCase()
      if (q && !text.includes(q)) return false
      if (category !== 'all' && p.category !== category) return false
      if (brandFilter && p.brand !== brandFilter) return false
      if (tab === 'best') return !!p.bestSeller
      if (tab === 'new') return !!p.newArrival
      if (tab === 'sale') return !!p.onSale
      return true
    })
  }, [query, category, tab, brandFilter])

  const product = products.find(p => p.id === productId) || products[0]
  const article = articles.find(a => a.id === articleId) || articles[0]
  const cartItems = products.filter(p => cart[p.id])
  const cartCount = Object.values(cart).reduce((s, n) => s + n, 0)
  const cartTotal = cartItems.reduce((s, p) => s + p.price * cart[p.id], 0)
  const wishItems = products.filter(p => wishlist.includes(p.id))
  const unread = notes.filter(n => n.unread).length
  const catName = (id: string) => {
    const c = categories.find(x => x.id === id)
    if (!c) return t.allInputs
    return bn ? c.nameBn : c.name
  }

  const addToCart = (p: Product) => {
    setCart(c => ({ ...c, [p.id]: (c[p.id] || 0) + 1 }))
    showToast(`${bn ? p.nameBn : p.name} ${t.added}`)
    setBump(true)
    window.setTimeout(() => setBump(false), 450)
  }
  const changeQty = (p: Product, n: number) => setCart(c => {
    const next = Math.max(0, (c[p.id] || 0) + n)
    const copyCart = { ...c }
    if (next) copyCart[p.id] = next; else delete copyCart[p.id]
    return copyCart
  })
  const toggleWish = (id: string) => {
    const on = wishlist.includes(id)
    setWishlist(w => on ? w.filter(x => x !== id) : [...w, id])
    showToast(on ? t.wishOff : t.wishOn)
  }
  const openProduct = (p: Product) => go('product', () => setProductId(p.id))
  const openShop = (cat = 'all', nextTab = 'all', brand = '') => go('shop', () => { setCategory(cat); setTab(nextTab); setBrandFilter(brand); setQuery('') })

  useEffect(() => { const id = window.setTimeout(() => setHeroReady(true), 60); return () => window.clearTimeout(id) }, [])
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      const max = document.documentElement.scrollHeight - window.innerHeight
      setScrolled(y > 8)
      setShowTop(y > 520)
      setProgress(max > 0 ? Math.min(100, (y / max) * 100) : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useReveal(page + query + category + tab + brandFilter + lang)

  const saleEnd = useRef(Date.now() + 2 * 86400000 + 14 * 3600000 + 32 * 60000).current
  const [remaining, setRemaining] = useState(saleEnd - Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setRemaining(Math.max(0, saleEnd - Date.now())), 1000)
    return () => window.clearInterval(id)
  }, [saleEnd])
  const rDays = Math.floor(remaining / 86400000)
  const rHours = Math.floor((remaining % 86400000) / 3600000)
  const rMins = Math.floor((remaining % 3600000) / 60000)
  const rSecs = Math.floor((remaining % 60000) / 1000)

  const onHeroMove = (e: React.MouseEvent) => {
    const el = heroRef.current; if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--hx', `${((e.clientX - rect.left) / rect.width - 0.5) * 22}px`)
    el.style.setProperty('--hy', `${((e.clientY - rect.top) / rect.height - 0.5) * 14}px`)
  }

  const bookService = (id: string) => {
    const svc = farmServices.find(s => s.id === id)
    if (!svc) return
    const when = new Date(Date.now() + 86400000).toLocaleDateString(bn ? 'bn-BD' : 'en-GB', { day: '2-digit', month: 'short' })
    setBookings(b => [{ id: `SRV-${Date.now().toString().slice(-5)}`, title: svc.title, titleBn: svc.titleBn, fee: svc.fee, when }, ...b])
    showToast(`${bn ? svc.titleBn : svc.title} ${t.bookedFor} ${when}`)
    go('account', () => setAcctTab('services'))
  }

  const placeOrder = () => {
    if (!cartItems.length) { showToast(t.cartEmptyT); return }
    if (!checkout.phone || !checkout.union) { showToast(t.addPhone); return }
    const id = `AMC-${Date.now().toString().slice(-5)}`
    const rec = { id, total: cartTotal + 80, pay: checkout.pay, district: checkout.district }
    setPlaced(p => [rec, ...p])
    setOrderDone(rec)
    setCart({})
    showToast(`${t.orderPlaced} ${id}`)
  }

  const submitTicket = () => {
    if (!ticket.message.trim()) { showToast(t.writeMsg); return }
    const id = `T-${Date.now().toString().slice(-4)}`
    setTickets(x => [{ id, topic: ticket.topic }, ...x])
    setTicket(t0 => ({ ...t0, message: '' }))
    showToast(`${t.ticketOpened} ${id}`)
  }

  const runTrack = () => {
    const hit = [...sampleOrders, ...placed.map(p => ({
      id: p.id, date: t.today, dateBn: t.today, status: 'Packed', district: p.district, total: p.total,
      items: t.justPlaced, itemsBn: t.justPlaced,
    }))].find(o => o.id.toLowerCase() === trackId.trim().toLowerCase()) || null
    setTrackHit(hit)
    if (!hit) showToast(t.noOrder)
  }

  const navKey = (label: string) => navMap[label] || 'home'
  const activeNav = (label: string) => {
    const target = navKey(label)
    if (target === 'shop') return page === 'shop' || page === 'product'
    if (target === 'knowledge') return page === 'knowledge' || page === 'article'
    if (target === 'support') return page === 'support' || page === 'help' || page === 'track'
    return page === target
  }

  const grid = (list: Product[]) => <div className="products">{list.map((p, i) => (
    <ProductCard key={p.id} product={p} bn={bn} t={t} index={i} wishlisted={wishlist.includes(p.id)}
      onWishlist={() => toggleWish(p.id)} onCart={() => addToCart(p)} onOpen={() => openProduct(p)}/>
  ))}</div>

  const shopTitle = brandFilter || (category === 'all' ? t.allInputs : catName(category))
  const shopNote = query ? `${t.resultsFor} “${query}”` : t.shopNote
  const payLabel = (key: string) => {
    const i = ['bKash', 'Nagad', 'Card', 'Cash on delivery'].indexOf(key)
    return i >= 0 ? t.pays[i] : key
  }
  const topicLabel = (key: string) => {
    const i = ['Delivery', 'Product quality', 'Payment', 'Service booking'].indexOf(key)
    return i >= 0 ? t.topics[i] : key
  }

  return <div className="shell" lang={bn ? 'bn' : 'en'}>
    <div className="page-grain" aria-hidden="true"/>
    <CursorGlow/>
    <div className="scroll-progress" style={{ transform: `scaleX(${progress / 100})` }}/>
    {toast && <div className="toast">✓ {toast}</div>}

    <div className="topline">
      <div>BD · {t.top}</div>
      <div>
        <button onClick={() => go('help')}>{t.help}</button>
        <button onClick={() => go('track')}>{t.track}</button>
        <button className="lang" onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}>{lang === 'en' ? 'বাংলা' : 'EN'}</button>
      </div>
    </div>

    <header className={scrolled ? 'scrolled' : ''}>
      <button className="logo" onClick={() => go('home')}><i>A</i><span>AgroMED<b>CONNECT</b></span></button>
      <button className="menu" onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button>
      <form className="header-search" onSubmit={e => { e.preventDefault(); setQuery(draft); go('shop') }}>
        <Search size={18}/>
        <input value={draft} onChange={e => setDraft(e.target.value)} placeholder={t.searchPh}/>
        <button type="submit">{t.search}</button>
      </form>
      <div className="header-icons">
        <button onClick={() => go('notifications')} aria-label={t.notifH}><Bell/>{unread > 0 && <i/>}</button>
        <button onClick={() => go('wishlist')}><Heart/>{wishItems.length > 0 && <em>{wishItems.length}</em>}<span>{t.wishlist}</span></button>
        <button onClick={() => setCartOpen(true)}><ShoppingCart/>{cartCount > 0 && <em className={bump ? 'bump' : ''}>{cartCount}</em>}<span>{t.cart}</span></button>
        <button className="account" onClick={() => go('account')}><UserRound/><span>{t.account}<small>{profile.name}</small></span><ChevronDown size={15}/></button>
      </div>
    </header>

    <nav className={menu ? 'open' : ''}>
      <div className="browse-wrap">
        <button className="browse" onClick={() => setBrowse(!browse)}>{t.browse} <ChevronDown size={15}/></button>
        {browse && <div className="browse-menu">{categories.map(c => (
          <button key={c.id} onClick={() => openShop(c.id)}><b>{c.icon}</b>{bn ? c.nameBn : c.name}<small>{bn ? c.noteBn : c.note}</small></button>
        ))}</div>}
      </div>
      {t.nav.map(label => (
        <button key={label} className={activeNav(label) ? 'selected' : ''} onClick={() => {
          const next = navKey(label)
          if (label === 'Categories' || label === 'ক্যাটাগরি') openShop('all')
          else go(next)
        }}>{label}{(label === 'Offers' || label === 'অফার') && <b>{t.hot}</b>}</button>
      ))}
    </nav>
    <PriceTicker bn={bn} label={t.market}/>

    <main>
      {page === 'home' && <>
        <section className="hero" ref={heroRef} onMouseMove={onHeroMove} onMouseLeave={() => { const el = heroRef.current; if (el) { el.style.setProperty('--hx', '0px'); el.style.setProperty('--hy', '0px') } }}>
          <div className={heroReady ? 'hero-image-wrap ready' : 'hero-image-wrap'}><img className="hero-image" src={farmerHero} alt=""/></div>
          <HeroParticles/>
          <div className="hero-shade"/>
          <div className={heroReady ? 'hero-copy ready' : 'hero-copy'}>
            <span className="eyebrow">{t.eyebrow}</span>
            <h1><SplitHeadline text={t.headline1} startDelay={0.05}/><br/><strong><SplitHeadline text={t.headline2} startDelay={0.22}/></strong></h1>
            <p>{t.heroP}</p>
            <div>
              <Magnetic className="shop-now" onClick={() => openShop()}>{t.shopNow} →</Magnetic>
              <Magnetic className="outline" onClick={() => go('services')}>{t.explore}</Magnetic>
            </div>
            <small>{t.heroTrust}</small>
          </div>
          <button className={heroReady ? 'hero-tag stamped' : 'hero-tag'} onClick={() => openShop('all', 'sale')}><b>{t.heroSave}</b><span>{t.heroSaveNote}</span></button>
        </section>
        <section className="features">{t.features.map((row, i) => (
          <button key={row[0]} className="reveal" style={{ transitionDelay: `${i * 70}ms` }} onClick={() => go(i === 2 ? 'services' : i === 3 ? 'checkout' : 'shop')}>
            <span>{['64', 'OK', 'AG', '৳'][i]}</span><p><b>{row[0]}</b>{row[1]}</p>
          </button>
        ))}</section>
        <section className="section">
          <div className="heading"><div><span className="eyebrow green">{t.shopNeed}</span><h2>{t.shopNeedH}</h2><p>{t.shopNeedP}</p></div><button className="text-link" onClick={() => openShop()}>{t.openShop}</button></div>
          <div className="category-grid">{categories.map((c, i) => (
            <button key={c.id} className="category reveal" style={{ transitionDelay: `${i * 50}ms` }} onClick={() => openShop(c.id)}>
              <i>{c.icon}</i><b>{bn ? c.nameBn : c.name}</b><small>{bn ? c.noteBn : c.note}</small><span>→</span>
            </button>
          ))}</div>
        </section>
        <section className="offer reveal">
          <div>
            <span>{t.flash}</span>
            <h2>{t.flashH}</h2>
            <p>{t.flashP}</p>
            <button onClick={() => openShop('all', 'sale')}>{t.shopSale}</button>
          </div>
          <div className="offer-stat"><b>{t.upTo}<br/><strong>30%</strong><br/>{t.off}</b>
            <small><FlipDigit value={pad(rDays)}/>d : <FlipDigit value={pad(rHours)}/>h : <FlipDigit value={pad(rMins)}/>m : <FlipDigit value={pad(rSecs)}/>s</small>
          </div>
        </section>
        <section className="section">
          <div className="heading"><div><span className="eyebrow green">{t.picks}</span><h2>{t.picksH}</h2><p>{t.picksP}</p></div>
            <div className="product-tabs">
              {[['all', t.tabAll], ['best', t.tabBest], ['new', t.tabNew]].map(([id, label]) => (
                <button key={id} className={tab === id ? 'tab-active' : ''} onClick={() => openShop('all', id)}>{label}</button>
              ))}
            </div>
          </div>
          {grid(products.filter(p => p.bestSeller).slice(0, 4))}
          <button className="view-products" onClick={() => openShop()}>{t.viewAll}</button>
        </section>
        <section className="brand-strip">
          <div className="brand-intro reveal">
            <span className="eyebrow">{t.brandEyebrow}</span>
            <h2>{t.brandH}</h2>
            <p>{t.brandP}</p>
            <ul className="brand-stats">
              <li><b>{t.since}</b></li>
              <li><b>{t.hq}</b></li>
              <li><b>{t.districts64}</b></li>
              <li><b>{t.farmers}</b></li>
            </ul>
          </div>
          <div className="trust-grid">{t.trust.map((row, i) => (
            <article key={row[0]} className="reveal" style={{ transitionDelay: `${i * 60}ms` }}>
              <i>{['01', '02', '03', '04'][i]}</i>
              <b>{row[0]}</b>
              <p>{row[1]}</p>
            </article>
          ))}</div>
        </section>
        <section className="services">
          <div className="service-copy reveal">
            <span className="eyebrow">{t.fieldSvc}</span>
            <h2>{t.svcH1}<br/><strong>{t.svcH2}</strong></h2>
            <p>{t.svcP}</p>
            <button onClick={() => go('services')}>{t.openSvc}</button>
          </div>
          <div className="service-cards">{farmServices.map((s, i) => (
            <article key={s.id} className="reveal" style={{ transitionDelay: `${i * 70}ms` }} onClick={() => go('services')}>
              <i>{s.icon}</i><b>{bn ? s.titleBn : s.title}</b><small>৳{s.fee} · {bn ? s.noteBn : s.note}</small><span>→</span>
            </article>
          ))}</div>
        </section>
      </>}

      {page === 'shop' && <section className="section shop-page">
        <PageHero kicker={t.catalog} title={shopTitle} note={shopNote}/>
        <div className="shop-toolbar">
          <div className="product-tabs">
            {[['all', t.tabAll], ['best', t.tabBest], ['new', t.tabNewFull], ['sale', t.tabSale]].map(([id, label]) => (
              <button key={id} className={tab === id ? 'tab-active' : ''} onClick={() => setTab(id)}>{label}</button>
            ))}
          </div>
          <div className="chip-row">
            <button className={category === 'all' ? 'chip on' : 'chip'} onClick={() => { setCategory('all'); setBrandFilter('') }}>{t.allCats}</button>
            {categories.map(c => <button key={c.id} className={category === c.id ? 'chip on' : 'chip'} onClick={() => { setCategory(c.id); setBrandFilter('') }}>{bn ? c.nameBn : c.name}</button>)}
          </div>
        </div>
        {grid(visible)}
        {visible.length === 0 && <div className="empty-state">{t.noMatch} <button onClick={() => { setQuery(''); setDraft(''); setCategory('all'); setTab('all'); setBrandFilter('') }}>{t.clear}</button></div>}
      </section>}

      {page === 'product' && <section className="section product-page">
        <button className="text-link" onClick={() => go('shop')}>{t.backShop}</button>
        <div className="pdp">
          <div className="pdp-photo"><img src={product.image} alt={bn ? product.nameBn : product.name}/></div>
          <div className="pdp-copy">
            <span className="eyebrow">{product.brand}</span>
            <h1>{bn ? product.nameBn : product.name}</h1>
            <p className="pdp-meta">{product.rating} · {product.reviews} {t.reviews} · {bn ? product.unitBn : product.unit}</p>
            <p>{bn ? product.descBn : product.desc}</p>
            <div className="price big"><b>৳{product.price.toLocaleString()}</b>{product.old ? <del>৳{product.old.toLocaleString()}</del> : null}</div>
            <p className="stock">{product.stock} {t.stockLine}</p>
            <div className="pdp-actions">
              <button className="shop-now" onClick={() => addToCart(product)}>{t.addCart}</button>
              <button className="outline" onClick={() => { addToCart(product); go('checkout') }}>{t.buyNow}</button>
              <button className={wishlist.includes(product.id) ? 'ghost on' : 'ghost'} onClick={() => toggleWish(product.id)}>{wishlist.includes(product.id) ? t.saved : t.save}</button>
            </div>
            <div className="chip-row tight">{(bn ? product.tagsBn : product.tags).map(tag => <span key={tag} className="chip static">{tag}</span>)}</div>
          </div>
        </div>
        <h3 className="subhead">{t.also}</h3>
        {grid(products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4))}
      </section>}

      {page === 'brands' && <section className="section">
        <PageHero kicker={t.partners} title={t.brandsH} note={t.brandsP}/>
        <div className="brand-grid">{brands.map((b, i) => (
          <button key={b.name} className="brand-card reveal" style={{ transitionDelay: `${i * 40}ms` }} onClick={() => openShop('all', 'all', b.name)}>
            <small>{bn ? b.sinceBn : b.since} · {bn ? b.fieldBn : b.field}</small>
            <h3>{b.name}</h3>
            <p>{bn ? b.noteBn : b.note}</p>
            <span>{products.filter(p => p.brand === b.name).length} {t.liveLots}</span>
          </button>
        ))}</div>
      </section>}

      {page === 'services' && <section className="section">
        <PageHero kicker={t.desk} title={t.svcPageH} note={t.svcPageP}/>
        <form className="panel" onSubmit={e => { e.preventDefault(); bookService('call') }}>
          <h3>{t.quickCall}</h3>
          <div className="form-grid">
            <label>{t.crop}<input value={serviceForm.crop} onChange={e => setServiceForm({ ...serviceForm, crop: e.target.value })}/></label>
            <label>{t.district}<select value={serviceForm.district} onChange={e => setServiceForm({ ...serviceForm, district: e.target.value })}>{districts.map(d => <option key={d} value={d}>{distName(d)}</option>)}</select></label>
            <label>{t.phone}<input value={serviceForm.phone} onChange={e => setServiceForm({ ...serviceForm, phone: e.target.value })}/></label>
          </div>
          <button className="shop-now" type="submit">{t.bookCall}</button>
        </form>
        <div className="service-list">{farmServices.map(s => (
          <article key={s.id} className="service-row reveal">
            <i>{s.icon}</i>
            <div><h3>{bn ? s.titleBn : s.title}</h3><p>{bn ? s.noteBn : s.note}</p></div>
            <b>৳{s.fee}</b>
            <button className="outline" onClick={() => bookService(s.id)}>{t.book}</button>
          </article>
        ))}</div>
      </section>}

      {page === 'offers' && <section className="section">
        <PageHero kicker={t.windows} title={t.offersH} note={t.offersP}/>
        <div className="offer reveal compact">
          <div><span>{t.monsoon}</span><h2>{t.cropCareOff}</h2><p>{pad(rDays)}d {pad(rHours)}h {pad(rMins)}m {pad(rSecs)}s {t.remaining}</p>
            <button onClick={() => openShop('all', 'sale')}>{t.openSale}</button></div>
        </div>
        {grid(products.filter(p => p.onSale))}
      </section>}

      {page === 'knowledge' && <section className="section">
        <PageHero kicker={t.notes} title={t.knowH} note={t.knowP}/>
        <div className="article-grid">{articles.map((a, i) => (
          <button key={a.id} className="article-card reveal" style={{ transitionDelay: `${i * 50}ms` }} onClick={() => go('article', () => setArticleId(a.id))}>
            <small>{bn ? a.kickerBn : a.kicker} · {bn ? a.readBn : a.read}</small>
            <h3>{bn ? a.titleBn : a.title}</h3>
            <p>{(bn ? a.bodyBn : a.body).slice(0, 140)}…</p>
            <span>{t.readNote}</span>
          </button>
        ))}</div>
      </section>}

      {page === 'article' && <section className="section article-page">
        <button className="text-link" onClick={() => go('knowledge')}>{t.backKnow}</button>
        <small className="eyebrow">{bn ? article.kickerBn : article.kicker} · {bn ? article.readBn : article.read}</small>
        <h1>{bn ? article.titleBn : article.title}</h1>
        <p className="lead">{bn ? article.bodyBn : article.body}</p>
        <button className="shop-now" onClick={() => go('services')}>{t.askAgro}</button>
      </section>}

      {(page === 'support' || page === 'help') && <section className="section">
        <PageHero kicker={t.desk} title={t.helpH} note={t.helpP}/>
        <div className="two-col">
          <form className="panel" onSubmit={e => { e.preventDefault(); submitTicket() }}>
            <h3>{t.openTicket}</h3>
            <label>{t.name}<input value={ticket.name} onChange={e => setTicket({ ...ticket, name: e.target.value })}/></label>
            <label>{t.topic}<select value={ticket.topic} onChange={e => setTicket({ ...ticket, topic: e.target.value })}>
              {['Delivery', 'Product quality', 'Payment', 'Service booking'].map((x, i) => <option key={x} value={x}>{t.topics[i]}</option>)}
            </select></label>
            <label>{t.message}<textarea rows={4} value={ticket.message} onChange={e => setTicket({ ...ticket, message: e.target.value })}/></label>
            <button className="shop-now" type="submit">{t.sendDesk}</button>
            {tickets[0] && <p className="ok">{t.latestTicket} {tickets[0].id} · {topicLabel(tickets[0].topic)}</p>}
          </form>
          <div>
            {faqs.map((f, i) => (
              <button key={f.q} className={faqOpen === i ? 'faq open' : 'faq'} onClick={() => setFaqOpen(faqOpen === i ? -1 : i)}>
                <b>{bn ? f.qBn : f.q}</b>{faqOpen === i && <p>{bn ? f.aBn : f.a}</p>}
              </button>
            ))}
            <button className="text-link" onClick={() => go('track')}>{t.trackOrder}</button>
          </div>
        </div>
      </section>}

      {page === 'track' && <section className="section">
        <PageHero kicker={t.vans} title={t.trackH} note={t.trackP}/>
        <form className="panel track-form" onSubmit={e => { e.preventDefault(); runTrack() }}>
          <label>{t.orderNo}<input value={trackId} onChange={e => setTrackId(e.target.value)}/></label>
          <button className="shop-now" type="submit">{t.trackBtn}</button>
        </form>
        {trackHit && <div className="track-card">
          <small>{trackHit.id}</small>
          <h3>{t.statusMap[trackHit.status] || trackHit.status}</h3>
          <p>{bn ? trackHit.itemsBn : trackHit.items} · {distName(trackHit.district)} · ৳{trackHit.total.toLocaleString()}</p>
          <ol className="steps">
            {t.steps.map((step, i) => {
              const rank = { Packed: 0, 'In transit': 1, 'Out for delivery': 2, Delivered: 3 }[trackHit.status] ?? 0
              return <li key={step} className={rank >= i ? 'done' : ''}>{step}</li>
            })}
          </ol>
        </div>}
      </section>}

      {page === 'notifications' && <section className="section">
        <PageHero kicker={t.tape} title={t.notifH} note={t.notifP}/>
        <div className="note-list">{notes.map(n => (
          <button key={n.id} className={n.unread ? 'note unread' : 'note'} onClick={() => { setNotes(list => list.map(x => x.id === n.id ? { ...x, unread: false } : x)); if (n.id === 'n1') go('track'); else if (n.id === 'n2') openShop('fertilizers'); else go('account') }}>
            <b>{bn ? n.titleBn : n.title}</b><p>{bn ? n.bodyBn : n.body}</p><small>{bn ? n.timeBn : n.time}</small>
          </button>
        ))}</div>
        <button className="text-link" onClick={() => setNotes(list => list.map(n => ({ ...n, unread: false })))}>{t.markRead}</button>
      </section>}

      {page === 'wishlist' && <section className="section">
        <PageHero kicker={t.save} title={t.wishH} note={t.wishP}/>
        {wishItems.length ? grid(wishItems) : <div className="empty-state">{t.nothingSaved} <button onClick={() => openShop()}>{t.browseLots}</button></div>}
      </section>}

      {page === 'account' && <section className="section">
        <PageHero kicker={t.member} title={profile.name} note={`${profile.union}, ${distName(profile.district)} · ${profile.phone}`}/>
        <div className="product-tabs">
          {([['orders', t.orders], ['profile', t.profile], ['services', t.bookings]] as const).map(([id, label]) => (
            <button key={id} className={acctTab === id ? 'tab-active' : ''} onClick={() => setAcctTab(id)}>{label}</button>
          ))}
        </div>
        {acctTab === 'orders' && <div className="order-list">
          {[...placed.map(p => ({ id: p.id, date: t.today, dateBn: t.today, status: 'Packed', district: p.district, total: p.total, items: t.justPlaced, itemsBn: t.justPlaced })), ...sampleOrders].map(o => (
            <button key={o.id} className="order-row" onClick={() => { setTrackId(o.id); go('track'); setTrackHit(o) }}>
              <b>{o.id}</b><span>{t.statusMap[o.status] || o.status}</span>
              <small>{bn ? o.dateBn : o.date} · {bn ? o.itemsBn : o.items}</small>
              <em>৳{o.total.toLocaleString()}</em>
            </button>
          ))}
        </div>}
        {acctTab === 'profile' && <form className="panel" onSubmit={e => { e.preventDefault(); showToast(t.profileSaved) }}>
          <label>{t.name}<input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })}/></label>
          <label>{t.phone}<input value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })}/></label>
          <label>{t.union}<input value={profile.union} onChange={e => setProfile({ ...profile, union: e.target.value })}/></label>
          <label>{t.district}<select value={profile.district} onChange={e => setProfile({ ...profile, district: e.target.value })}>{districts.map(d => <option key={d} value={d}>{distName(d)}</option>)}</select></label>
          <button className="shop-now" type="submit">{t.saveProfile}</button>
        </form>}
        {acctTab === 'services' && (bookings.length ? <div className="order-list">{bookings.map(b => (
          <div key={b.id} className="order-row static"><b>{bn ? b.titleBn : b.title}</b><span>{t.booked}</span><small>{b.id} · {b.when}</small><em>৳{b.fee}</em></div>
        ))}</div> : <div className="empty-state">{t.noBook} <button onClick={() => go('services')}>{t.openSvc2}</button></div>)}
      </section>}

      {page === 'checkout' && <section className="section">
        <PageHero kicker={t.settle} title={t.checkH} note={t.checkP}/>
        {orderDone ? <div className="panel success">
          <h3>{t.orders} {orderDone.id} {t.packed}</h3>
          <p>৳{orderDone.total.toLocaleString()} · {payLabel(orderDone.pay)} · {distName(orderDone.district)}</p>
          <button className="shop-now" onClick={() => { setTrackId(orderDone.id); setTrackHit({ id: orderDone.id, date: t.today, dateBn: t.today, status: 'Packed', district: orderDone.district, total: orderDone.total, items: t.justPlaced, itemsBn: t.justPlaced }); setOrderDone(null); go('track') }}>{t.trackVan}</button>
        </div> : <div className="two-col">
          <form className="panel" onSubmit={e => { e.preventDefault(); placeOrder() }}>
            <label>{t.name}<input value={checkout.name} onChange={e => setCheckout({ ...checkout, name: e.target.value })}/></label>
            <label>{t.phone}<input value={checkout.phone} onChange={e => setCheckout({ ...checkout, phone: e.target.value })}/></label>
            <label>{t.district}<select value={checkout.district} onChange={e => setCheckout({ ...checkout, district: e.target.value })}>{districts.map(d => <option key={d} value={d}>{distName(d)}</option>)}</select></label>
            <label>{t.unionArea}<input value={checkout.union} onChange={e => setCheckout({ ...checkout, union: e.target.value })}/></label>
            <label>{t.payWith}<select value={checkout.pay} onChange={e => setCheckout({ ...checkout, pay: e.target.value })}>
              {['bKash', 'Nagad', 'Card', 'Cash on delivery'].map((p, i) => <option key={p} value={p}>{t.pays[i]}</option>)}
            </select></label>
            <label>{t.note}<textarea rows={3} value={checkout.note} onChange={e => setCheckout({ ...checkout, note: e.target.value })}/></label>
            <button className="shop-now" type="submit">{t.placeOrder} · ৳{(cartTotal + (cartItems.length ? 80 : 0)).toLocaleString()}</button>
          </form>
          <aside className="panel">
            <h3>{t.bag}</h3>
            {cartItems.length ? cartItems.map(p => <p key={p.id}>{bn ? p.nameBn : p.name} × {cart[p.id]} <b>৳{(p.price * cart[p.id]).toLocaleString()}</b></p>) : <p>{t.cartEmpty}</p>}
            <hr/>
            <p>{t.delivery} <b>৳{cartItems.length ? 80 : 0}</b></p>
            <p>{t.total} <b>৳{(cartTotal + (cartItems.length ? 80 : 0)).toLocaleString()}</b></p>
            {!cartItems.length && <button className="text-link" onClick={() => openShop()}>{t.addFirst}</button>}
          </aside>
        </div>}
      </section>}
    </main>

    {cartOpen && <CartDrawer items={cartItems} qty={cart} bn={bn} t={t} onClose={() => setCartOpen(false)} onQty={changeQty}
      onCheckout={() => go('checkout')} onShop={() => openShop()}/>}

    <footer>
      <button className="logo light" onClick={() => go('home')}><i>A</i><span>AgroMED<b>CONNECT</b></span></button>
      <div className="foot-links">
        <button onClick={() => openShop()}>{t.footShop}</button>
        <button onClick={() => go('services')}>{t.footSvc}</button>
        <button onClick={() => go('knowledge')}>{t.footKnow}</button>
        <button onClick={() => go('support')}>{t.footSup}</button>
        <button onClick={() => go('track')}>{t.footTrack}</button>
      </div>
      <span>{t.copyright}</span>
    </footer>
    <button className={showTop ? 'to-top visible' : 'to-top'} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top">↑</button>
  </div>
}
