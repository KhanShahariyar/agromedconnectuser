import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bell, ChevronDown, Heart, Menu, Search, ShoppingCart, UserRound, X } from 'lucide-react'
import farmerHero from './assets/farmer-hero.png'
import { faqs, payKeys, topicKeys, type Page } from './data'
import { i18n } from './i18n'
import {
  CartDrawer, CursorGlow, FlipDigit, HeroParticles, Magnetic, PageHero,
  PriceTicker, ProductCard, SplitHeadline, pad, useReveal,
} from './ui'
import * as api from './api/endpoints'
import { getLocale, setLocale } from './api/client'
import { ApiError } from './api/problem'
import { useQuery } from './state/useQuery'
import { Async, SkeletonGrid } from './state/Async'
import { useAuth } from './state/AuthProvider'
import {
  formatDate, toArticles, toBrands, toCategories, toOrders, toProduct, toProductDetail, toServices,
  type ProductView,
} from './api/view'

type Lang = 'en' | 'bn'

/**
 * Locale is a request header, not a UI flag.
 *
 * The API renders listing names, category names and every price string server-side against the
 * locale it was asked for, so switching language has to reach the network layer before any query
 * re-runs. `setLocale` is called during render rather than in an effect for exactly that reason:
 * by the time the queries below build their keys, the client must already be speaking the new
 * language, or the first fetch after a switch comes back in the old one.
 */
const API_LOCALE: Record<Lang, 'en-US' | 'bn-BD'> = { en: 'en-US', bn: 'bn-BD' }

const navMap: Record<string, Page> = {
  Home: 'home', Shop: 'shop', Categories: 'shop', Brands: 'brands',
  Services: 'services', Offers: 'offers', Knowledge: 'knowledge', Support: 'support',
  হোম: 'home', দোকান: 'shop', ক্যাটাগরি: 'shop', ব্র্যান্ড: 'brands',
  সেবা: 'services', অফার: 'offers', জ্ঞান: 'knowledge', সহায়তা: 'support',
}

/** Maps the shop's tabs onto what the search endpoint actually understands. */
function tabFilters(tab: string): Partial<api.SearchArgs> {
  if (tab === 'best') return { sort: 'rating' }
  if (tab === 'new') return { sort: 'newest' }
  if (tab === 'sale') return { onOfferOnly: true }
  return {}
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
  const [productId, setProductId] = useState<string | null>(null)
  const [articleId, setArticleId] = useState<string | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [busyItemId, setBusyItemId] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const [showTop, setShowTop] = useState(false)
  const [progress, setProgress] = useState(0)
  const [bump, setBump] = useState(false)
  const [heroReady, setHeroReady] = useState(false)
  const [faqOpen, setFaqOpen] = useState(0)
  const [trackNumber, setTrackNumber] = useState('')
  const [trackHitId, setTrackHitId] = useState<string | null>(null)
  const [acctTab, setAcctTab] = useState<'orders' | 'profile' | 'services'>('orders')
  const [checkoutForm, setCheckoutForm] = useState({ addressLine: '', phone: '', geographyId: '', pay: '', note: '' })
  const [placedOrder, setPlacedOrder] = useState<{ number: string; total: string } | null>(null)
  const [placing, setPlacing] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [ticket, setTicket] = useState({ name: '', topic: 'Delivery', message: '' })
  const [tickets, setTickets] = useState<{ id: string; topic: string }[]>([])
  const [serviceForm, setServiceForm] = useState({ crop: '', geographyId: '', phone: '' })
  const heroRef = useRef<HTMLElement>(null)

  const auth = useAuth()
  const t = i18n[lang]
  const bn = lang === 'bn'
  const signedIn = auth.status === 'authenticated'

  // Applied during render, before any query key below is built. See API_LOCALE.
  if (getLocale() !== API_LOCALE[lang]) setLocale(API_LOCALE[lang])
  const locale = API_LOCALE[lang]

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2400)
  }, [])

  const go = (next: Page, extra?: () => void) => {
    extra?.()
    setPage(next)
    setMenu(false)
    setBrowse(false)
    setCartOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ------------------------------------------------------------------ queries
  // Every key carries the locale, so switching language invalidates the lot and the API re-renders
  // the same rows in the other script. Nothing is translated in the browser.

  const categoriesQuery = useQuery(`categories|${locale}`, (signal) =>
    api.getCategories(signal).then(toCategories))

  /**
   * The shop grid.
   *
   * Filtering and sorting are the server's job, not a `.filter()` over a fetched array. The mock
   * version could filter locally because it held seventeen products; a real catalogue does not fit
   * in the browser, and a filter that only searches the page you happen to have loaded quietly
   * lies about what is for sale.
   */
  const shopQuery = useQuery(
    `search|${locale}|${query}|${category}|${tab}|${brandFilter}`,
    (signal) => api.search({
      text: query || undefined,
      categoryId: category === 'all' ? undefined : category,
      brand: brandFilter || undefined,
      limit: 48,
      ...tabFilters(tab),
    }, signal).then((r) => r.items.map(toProduct)),
  )

  /** Home page picks. A separate query from the shop's, so navigating does not refetch both. */
  const featuredQuery = useQuery(`featured|${locale}`, (signal) =>
    api.search({ sort: 'rating', limit: 4 }, signal).then((r) => r.items.map(toProduct)))

  const tickerQuery = useQuery(`ticker|${locale}`, (signal) =>
    api.search({ limit: 8 }, signal).then((r) => r.items.map(toProduct)))

  const brandsQuery = useQuery(`brands|${locale}`, (signal) =>
    api.search({ limit: 100 }, signal).then((r) => toBrands(r.items)))

  const servicesQuery = useQuery(`services|${locale}`, (signal) =>
    api.getServices(signal).then(toServices))

  const articlesQuery = useQuery(`articles|${locale}`, (signal) =>
    api.getArticles(12, signal).then((list) => toArticles(list, t.minRead)))

  const offersQuery = useQuery(`offers|${locale}`, (signal) =>
    api.search({ onOfferOnly: true, limit: 24 }, signal).then((r) => r.items.map(toProduct)))

  const paymentQuery = useQuery(`payments|${locale}`, (signal) => api.getPaymentMethods(signal))

  const geographyQuery = useQuery(`geographies|${locale}`, (signal) =>
    api.getGeographies(signal).then((rows) => {
      // The reference table is a hierarchy and only the levels actually seeded are present. Taking
      // the deepest populated level below `country` means this keeps working as districts and
      // upazilas are added, without a code change or a hard-coded list of sixty-four names.
      const byLevel = new Map<string, typeof rows>()
      for (const row of rows) {
        if (row.level === 'country') continue
        byLevel.set(row.level, [...(byLevel.get(row.level) ?? []), row])
      }
      const order = ['union', 'upazila', 'district', 'division']
      for (const level of order) {
        const found = byLevel.get(level)
        if (found?.length) return found
      }
      return []
    }))

  const productQuery = useQuery(
    `listing|${locale}|${productId ?? ''}`,
    (signal) => api.getListing(productId!, signal).then(toProductDetail),
    { enabled: productId !== null },
  )

  const relatedQuery = useQuery(
    `related|${locale}|${productId ?? ''}`,
    (signal) => api.getSuggestions(productId!, signal).then((list) => list.map(toProduct)),
    { enabled: productId !== null },
  )

  // ---- signed-in reads. `enabled` keeps them from firing a guaranteed 401 while anonymous.

  const cartQuery = useQuery(`cart|${locale}|${signedIn}`, (signal) => api.getCart(signal), {
    enabled: signedIn,
    isEmpty: (cart) => cart.itemCount === 0,
  })

  const ordersQuery = useQuery(`orders|${locale}|${signedIn}`, (signal) =>
    api.getOrders({ limit: 30 }, signal).then((r) => toOrders(r.items)), { enabled: signedIn })

  const wishlistQuery = useQuery(`wishlist|${locale}|${signedIn}`, (signal) =>
    api.getWishlist(signal).then((r) => r.items.map(toProduct)), { enabled: signedIn })

  const bookingsQuery = useQuery(`bookings|${locale}|${signedIn}`, (signal) =>
    api.getBookings(signal).then((r) => (Array.isArray(r) ? r : r.items)), { enabled: signedIn })

  const cart = cartQuery.data
  const cartCount = cart?.itemCount ?? 0
  const wishlistIds = useMemo(
    () => new Set((wishlistQuery.data ?? []).map((p) => p.id)),
    [wishlistQuery.data],
  )

  // --------------------------------------------------------------- mutations

  /**
   * Runs a write, then re-reads what it changed.
   *
   * Deliberately not optimistic. An optimistic basket has to guess the server's arithmetic —
   * discounts, per-seller delivery, a price that moved — and when the guess is wrong the number
   * changes under the user's eyes a moment later. Re-reading costs a round trip and is always right.
   */
  const mutate = useCallback(async (
    itemId: string | null,
    action: () => Promise<unknown>,
    onDone?: () => void,
  ) => {
    setBusyItemId(itemId)
    try {
      await action()
      onDone?.()
    } catch (error) {
      showToast(error instanceof ApiError ? error.detail : t.loadFailed)
    } finally {
      setBusyItemId(null)
    }
  }, [showToast, t.loadFailed])

  const requireSignIn = () => {
    showToast(t.signInNeeded)
    go('account')
  }

  const addToCart = (product: ProductView) => {
    if (!signedIn) return requireSignIn()
    void mutate(null, () => api.addToCart(product.id, 1), () => {
      cartQuery.reload()
      showToast(`${product.name} ${t.added}`)
      setBump(true)
      window.setTimeout(() => setBump(false), 450)
    })
  }

  const changeQty = (itemId: string, quantity: number) =>
    void mutate(itemId, () => api.updateCartItem(itemId, quantity), cartQuery.reload)

  const removeLine = (itemId: string) =>
    void mutate(itemId, () => api.removeCartItem(itemId), cartQuery.reload)

  const toggleWish = (id: string) => {
    if (!signedIn) return requireSignIn()
    const on = wishlistIds.has(id)
    void mutate(null, () => (on ? api.removeFromWishlist(id) : api.addToWishlist(id)), () => {
      wishlistQuery.reload()
      showToast(on ? t.wishOff : t.wishOn)
    })
  }

  const openProduct = (p: { id: string }) => go('product', () => setProductId(p.id))
  const openShop = (cat = 'all', nextTab = 'all', brand = '') =>
    go('shop', () => { setCategory(cat); setTab(nextTab); setBrandFilter(brand); setQuery('') })

  /**
   * Places the order.
   *
   * Quote first, then place with the token the quote returned. The two-step exists so the price the
   * buyer agreed to is the price the server charges: the client never posts a total, and a price
   * that moved between the two calls is refused rather than silently applied.
   */
  const placeOrder = async () => {
    if (!signedIn) return requireSignIn()
    if (!cart || cart.itemCount === 0) { showToast(t.cartEmptyT); return }
    if (!checkoutForm.phone.trim() || !checkoutForm.addressLine.trim() || !checkoutForm.geographyId) {
      setCheckoutError(t.addPhone)
      return
    }
    setPlacing(true)
    setCheckoutError(null)
    try {
      const quote = await api.quoteCheckout({
        deliveryGeographyId: checkoutForm.geographyId,
        paymentMethod: checkoutForm.pay,
      })
      const order = await api.placeOrder({
        quoteToken: quote.quoteToken,
        paymentMethod: checkoutForm.pay,
        deliveryAddress: checkoutForm.addressLine.trim(),
        deliveryContactPhone: checkoutForm.phone.trim(),
        deliveryGeographyId: checkoutForm.geographyId,
        note: checkoutForm.note.trim() || undefined,
      })
      setPlacedOrder({ number: order.orderNumber, total: order.grandTotal.display })
      cartQuery.reload()
      ordersQuery.reload()
      showToast(`${t.orderPlaced} ${order.orderNumber}`)
    } catch (error) {
      setCheckoutError(error instanceof ApiError ? error.detail : t.loadFailed)
    } finally {
      setPlacing(false)
    }
  }

  const bookService = async (serviceId: string) => {
    if (!signedIn) return requireSignIn()
    if (!serviceForm.phone.trim() || !serviceForm.geographyId) { showToast(t.addPhone); return }
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    await mutate(null, () => api.createBooking({
      serviceId,
      preferredDate: tomorrow,
      location: serviceForm.crop.trim() || '—',
      contactPhone: serviceForm.phone.trim(),
      geographyId: serviceForm.geographyId,
      paymentMethod: checkoutForm.pay || paymentQuery.data?.[0] || 'cash_on_delivery',
    }), () => {
      bookingsQuery.reload()
      showToast(`${t.bookedFor} ${tomorrow}`)
      go('account', () => setAcctTab('services'))
    })
  }

  const submitTicket = () => {
    if (!ticket.message.trim()) { showToast(t.writeMsg); return }
    // Support tickets have no endpoint in this phase, so this stays local and says so rather than
    // pretending to have reached anyone. TODO: REVIEW — wire to a support endpoint when one exists.
    const id = `T-${Date.now().toString().slice(-4)}`
    setTickets((x) => [{ id, topic: ticket.topic }, ...x])
    setTicket((prev) => ({ ...prev, message: '' }))
    showToast(`${t.ticketOpened} ${id}`)
  }

  const trackedOrder = useMemo(() => {
    const orders = ordersQuery.data ?? []
    if (trackHitId) return orders.find((o) => o.id === trackHitId) ?? null
    const needle = trackNumber.trim().toLowerCase()
    if (!needle) return null
    return orders.find((o) => o.number.toLowerCase() === needle) ?? null
  }, [ordersQuery.data, trackHitId, trackNumber])

  // --------------------------------------------------------------- chrome

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
  useReveal(page + query + category + tab + brandFilter + lang + shopQuery.status)

  // Prefills the delivery and service forms from the account once it is known, so a signed-in user
  // is not retyping their own phone number.
  useEffect(() => {
    if (!auth.user) return
    const phone = auth.user.phoneE164 ?? ''
    setCheckoutForm((f) => (f.phone ? f : { ...f, phone }))
    setServiceForm((f) => (f.phone ? f : { ...f, phone }))
    setTicket((f) => (f.name ? f : { ...f, name: auth.user!.fullName }))
  }, [auth.user])

  // Defaults the pickers to the first real option once reference data lands. Hard-coding a default
  // would post a code the platform may have disabled, and the failure would land on the buyer at
  // the moment they press Place order.
  useEffect(() => {
    const first = geographyQuery.data?.[0]?.id
    if (!first) return
    setCheckoutForm((f) => (f.geographyId ? f : { ...f, geographyId: first }))
    setServiceForm((f) => (f.geographyId ? f : { ...f, geographyId: first }))
  }, [geographyQuery.data])

  useEffect(() => {
    const first = paymentQuery.data?.[0]
    if (first) setCheckoutForm((f) => (f.pay ? f : { ...f, pay: first }))
  }, [paymentQuery.data])

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

  const navKey = (label: string) => navMap[label] || 'home'
  const activeNav = (label: string) => {
    const target = navKey(label)
    if (target === 'shop') return page === 'shop' || page === 'product'
    if (target === 'knowledge') return page === 'knowledge' || page === 'article'
    if (target === 'support') return page === 'support' || page === 'help' || page === 'track'
    return page === target
  }

  /**
   * Sign-in, shown in place of any page that needs an account.
   *
   * An element, not a component declared here.
   *
   * It was written as an inner `function SignInPanel()` first, and that quietly broke the form:
   * a component declared during render is a *new type* on every render, so React unmounted and
   * remounted it each time anything in `App` changed state — including the query-status changes
   * that fire while the user is typing. The remount discarded `SignInForm`'s own state, and the
   * fields cleared themselves character by character. Holding an element built from a stable,
   * module-level component keeps the instance alive across renders.
   */
  const signInPanel = <SignInForm
    t={t}
    restoring={auth.status === 'restoring'}
    onSignIn={auth.signIn}
    onRegister={auth.register}
  />

  const grid = (list: ProductView[]) => <div className="products">{list.map((p, i) => (
    <ProductCard key={p.id} product={p} t={t} index={i} wishlisted={wishlistIds.has(p.id)}
      onWishlist={() => toggleWish(p.id)} onCart={() => addToCart(p)} onOpen={() => openProduct(p)}/>
  ))}</div>

  const clearFilters = () => { setQuery(''); setDraft(''); setCategory('all'); setTab('all'); setBrandFilter('') }
  const categoryName = (id: string) =>
    categoriesQuery.data?.find((c) => c.id === id)?.name ?? t.allInputs
  const shopTitle = brandFilter || (category === 'all' ? t.allInputs : categoryName(category))
  const shopNote = query ? `${t.resultsFor} “${query}”` : t.shopNote
  /**
   * A readable name for a payment code.
   *
   * The translated labels cover the four methods the copy was written for; anything else the
   * platform enables — `rocket`, `bank_transfer` — falls back to its own code with the underscores
   * turned into spaces, which is legible and, more importantly, true. Hiding an unknown method
   * would silently remove a way to pay.
   */
  const payLabel = (code: string) => {
    const i = payKeys.indexOf(code as (typeof payKeys)[number])
    if (i >= 0) return t.pays[i]
    return code.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
  }
  const topicLabel = (key: string) => {
    const i = topicKeys.indexOf(key as (typeof topicKeys)[number])
    return i >= 0 ? t.topics[i] : key
  }

  return <div className="shell" lang={bn ? 'bn' : 'en'}>
    <div className="page-grain" aria-hidden="true"/>
    <CursorGlow/>
    <div className="scroll-progress" style={{ transform: `scaleX(${progress / 100})` }}/>
    {toast && <div className="toast" role="status">✓ {toast}</div>}

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
      <button className="menu" onClick={() => setMenu(!menu)} aria-label={t.browse}>{menu ? <X/> : <Menu/>}</button>
      <form className="header-search" onSubmit={(e) => { e.preventDefault(); setQuery(draft); go('shop') }}>
        <Search size={18}/>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t.searchPh}/>
        <button type="submit">{t.search}</button>
      </form>
      <div className="header-icons">
        <button onClick={() => go('notifications')} aria-label={t.notifH}><Bell/></button>
        <button onClick={() => go('wishlist')}><Heart/>{wishlistIds.size > 0 && <em>{wishlistIds.size}</em>}<span>{t.wishlist}</span></button>
        <button onClick={() => (signedIn ? setCartOpen(true) : requireSignIn())}>
          <ShoppingCart/>{cartCount > 0 && <em className={bump ? 'bump' : ''}>{cartCount}</em>}<span>{t.cart}</span>
        </button>
        <button className="account" onClick={() => go('account')}>
          <UserRound/>
          <span>{t.account}<small>{auth.status === 'restoring' ? '…' : auth.user?.fullName ?? t.signIn}</small></span>
          <ChevronDown size={15}/>
        </button>
      </div>
    </header>

    <nav className={menu ? 'open' : ''}>
      <div className="browse-wrap">
        <button className="browse" onClick={() => setBrowse(!browse)}>{t.browse} <ChevronDown size={15}/></button>
        {browse && <div className="browse-menu">{(categoriesQuery.data ?? []).map((c) => (
          <button key={c.id} onClick={() => openShop(c.id)}><b>{c.index}</b>{c.name}<small>{c.childNames}</small></button>
        ))}</div>}
      </div>
      {t.nav.map((label) => (
        <button key={label} className={activeNav(label) ? 'selected' : ''} onClick={() => {
          const next = navKey(label)
          if (label === 'Categories' || label === 'ক্যাটাগরি') openShop('all')
          else go(next)
        }}>{label}{(label === 'Offers' || label === 'অফার') && <b>{t.hot}</b>}</button>
      ))}
      {/* The top line is hidden below 640px, and it held the only language switch. On a phone -- the
          device most of this site's users are on -- that left a Bengali speaker with no way to
          reach Bengali, which since the switch now also sets the API locale means no way to read
          product names in their own script either. These repeat those controls inside the drawer;
          CSS shows them only where the top line is gone. */}
      <div className="nav-extra">
        <button onClick={() => go('help')}>{t.help}</button>
        <button onClick={() => go('track')}>{t.track}</button>
        <button className="lang" onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}>{lang === 'en' ? 'বাংলা' : 'EN'}</button>
      </div>
    </nav>
    <PriceTicker items={tickerQuery.data ?? []} label={t.market}/>

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
          <Async query={categoriesQuery} skeleton={<SkeletonGrid count={6}/>} emptyTitle={t.noProducts}>
            {(list) => <div className="category-grid">{list.map((c, i) => (
              <button key={c.id} className="category reveal" style={{ transitionDelay: `${i * 50}ms` }} onClick={() => openShop(c.id)}>
                <i>{c.index}</i><b>{c.name}</b><small>{c.childNames}</small><span>→</span>
              </button>
            ))}</div>}
          </Async>
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
          <Async query={featuredQuery} emptyTitle={t.noProducts} emptyNote={t.noProductsP}>
            {(list) => grid(list)}
          </Async>
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
          <Async query={servicesQuery} skeleton={<SkeletonGrid count={4}/>} emptyTitle={t.noServices}>
            {(list) => <div className="service-cards">{list.slice(0, 4).map((s, i) => (
              <article key={s.id} className="reveal" style={{ transitionDelay: `${i * 70}ms` }} onClick={() => go('services')}>
                <i>{s.index}</i><b>{s.name}</b><small>{s.price} · {s.categoryName}</small><span>→</span>
              </article>
            ))}</div>}
          </Async>
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
            {(categoriesQuery.data ?? []).map((c) => (
              <button key={c.id} className={category === c.id ? 'chip on' : 'chip'} onClick={() => { setCategory(c.id); setBrandFilter('') }}>{c.name}</button>
            ))}
          </div>
        </div>
        <Async
          query={shopQuery}
          skeleton={<SkeletonGrid count={8}/>}
          emptyTitle={t.noProducts}
          emptyNote={t.noProductsP}
          emptyAction={<button className="shop-now" onClick={clearFilters}>{t.clear}</button>}
        >
          {(list) => grid(list)}
        </Async>
      </section>}

      {page === 'product' && <section className="section product-page">
        <button className="text-link" onClick={() => go('shop')}>{t.backShop}</button>
        <Async query={productQuery} skeleton={<SkeletonGrid count={2} tall/>} emptyTitle={t.noProducts}>
          {(product) => <>
            <div className="pdp">
              <div className="pdp-photo">
                {product.image ? <img src={product.image} alt={product.name}/> : <span className="photo-fallback" aria-hidden>{product.name.slice(0, 1)}</span>}
              </div>
              <div className="pdp-copy">
                <span className="eyebrow">{product.brand || product.categoryName}</span>
                <h1>{product.name}</h1>
                <p className="pdp-meta">
                  {product.reviews > 0 ? `${product.rating.toFixed(1)} · ${product.reviews} ${t.reviews}` : t.noReviews}
                  {product.unit ? ` · ${product.unit}` : ''} · {t.sku} {product.sku}
                </p>
                <p>{product.description}</p>
                <div className="price big"><b>{product.price}</b>{product.originalPrice ? <del>{product.originalPrice}</del> : null}</div>
                <p className="stock">{t.seller}: {product.sellerName}</p>
                <div className="pdp-actions">
                  <button className="shop-now" onClick={() => addToCart(product)} disabled={product.stockSignal === 'out_of_stock'}>{t.addCart}</button>
                  <button className="outline" onClick={() => { addToCart(product); go('checkout') }} disabled={product.stockSignal === 'out_of_stock'}>{t.buyNow}</button>
                  <button className={wishlistIds.has(product.id) ? 'ghost on' : 'ghost'} onClick={() => toggleWish(product.id)}>{wishlistIds.has(product.id) ? t.saved : t.save}</button>
                </div>
                {product.attributes.length > 0 && <div className="chip-row tight">
                  {product.attributes.map((a) => <span key={a.label} className="chip static">{a.label}: {a.value}</span>)}
                </div>}
              </div>
            </div>
            {product.usage.length > 0 && <div className="panel usage">
              {product.usage.map((u) => <div key={u.heading}><h4>{u.heading}</h4><p>{u.body}</p></div>)}
            </div>}
            <h3 className="subhead">{t.also}</h3>
            <Async query={relatedQuery} emptyTitle={t.noProducts}>{(list) => grid(list)}</Async>
          </>}
        </Async>
      </section>}

      {page === 'brands' && <section className="section">
        <PageHero kicker={t.partners} title={t.brandsH} note={t.brandsP}/>
        <Async query={brandsQuery} skeleton={<SkeletonGrid count={6}/>} emptyTitle={t.noBrands}>
          {(list) => <div className="brand-grid">{list.map((b, i) => (
            <button key={b.name} className="brand-card reveal" style={{ transitionDelay: `${i * 40}ms` }} onClick={() => openShop('all', 'all', b.name)}>
              <small>{b.fields}</small>
              <h3>{b.name}</h3>
              <span>{b.listings} {t.liveLots}</span>
            </button>
          ))}</div>}
        </Async>
      </section>}

      {page === 'services' && <section className="section">
        <PageHero kicker={t.desk} title={t.svcPageH} note={t.svcPageP}/>
        <div className="panel">
          <h3>{t.quickCall}</h3>
          <div className="form-grid">
            <label>{t.crop}<input value={serviceForm.crop} onChange={(e) => setServiceForm({ ...serviceForm, crop: e.target.value })}/></label>
            <label>{t.district}<select value={serviceForm.geographyId} onChange={(e) => setServiceForm({ ...serviceForm, geographyId: e.target.value })}>
              {(geographyQuery.data ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select></label>
            <label>{t.phone}<input value={serviceForm.phone} onChange={(e) => setServiceForm({ ...serviceForm, phone: e.target.value })}/></label>
          </div>
        </div>
        <Async query={servicesQuery} skeleton={<SkeletonGrid count={4}/>} emptyTitle={t.noServices}>
          {(list) => <div className="service-list">{list.map((s) => (
            <article key={s.id} className="service-row reveal">
              <i>{s.index}</i>
              <div><h3>{s.name}</h3><p>{s.note}</p></div>
              <b>{s.price}</b>
              <button className="outline" onClick={() => void bookService(s.id)}>{t.book}</button>
            </article>
          ))}</div>}
        </Async>
      </section>}

      {page === 'offers' && <section className="section">
        <PageHero kicker={t.windows} title={t.offersH} note={t.offersP}/>
        <div className="offer reveal compact">
          <div><span>{t.monsoon}</span><h2>{t.cropCareOff}</h2><p>{pad(rDays)}d {pad(rHours)}h {pad(rMins)}m {pad(rSecs)}s {t.remaining}</p>
            <button onClick={() => openShop('all', 'sale')}>{t.openSale}</button></div>
        </div>
        <Async query={offersQuery} skeleton={<SkeletonGrid count={4}/>} emptyTitle={t.noProducts} emptyNote={t.noProductsP}>
          {(list) => grid(list)}
        </Async>
      </section>}

      {page === 'knowledge' && <section className="section">
        <PageHero kicker={t.notes} title={t.knowH} note={t.knowP}/>
        <Async query={articlesQuery} skeleton={<SkeletonGrid count={6}/>} emptyTitle={t.noArticles}>
          {(list) => <div className="article-grid">{list.map((a, i) => (
            <button key={a.id} className="article-card reveal" style={{ transitionDelay: `${i * 50}ms` }} onClick={() => go('article', () => setArticleId(a.id))}>
              <small>{a.kicker} · {a.read}</small>
              <h3>{a.title}</h3>
              <p>{a.summary}</p>
              <span>{t.readNote}</span>
            </button>
          ))}</div>}
        </Async>
      </section>}

      {page === 'article' && <section className="section article-page">
        <button className="text-link" onClick={() => go('knowledge')}>{t.backKnow}</button>
        <Async query={articlesQuery} emptyTitle={t.noArticles}>
          {(list) => {
            const article = list.find((a) => a.id === articleId) ?? list[0]
            if (!article) return null
            return <>
              <small className="eyebrow">{article.kicker} · {article.read}</small>
              <h1>{article.title}</h1>
              {/* The content endpoint returns a summary, not a body — there is no article-detail
                  route to call. Rendering the summary as the article is honest; padding it with
                  invented paragraphs would not be. */}
              <p className="lead">{article.summary}</p>
              <small className="muted">{formatDate(article.publishedAt, locale)}</small>
              <button className="shop-now" onClick={() => go('services')}>{t.askAgro}</button>
            </>
          }}
        </Async>
      </section>}

      {(page === 'support' || page === 'help') && <section className="section">
        <PageHero kicker={t.desk} title={t.helpH} note={t.helpP}/>
        <div className="two-col">
          <form className="panel" onSubmit={(e) => { e.preventDefault(); submitTicket() }}>
            <h3>{t.openTicket}</h3>
            <label>{t.name}<input value={ticket.name} onChange={(e) => setTicket({ ...ticket, name: e.target.value })}/></label>
            <label>{t.topic}<select value={ticket.topic} onChange={(e) => setTicket({ ...ticket, topic: e.target.value })}>
              {topicKeys.map((x, i) => <option key={x} value={x}>{t.topics[i]}</option>)}
            </select></label>
            <label>{t.message}<textarea rows={4} value={ticket.message} onChange={(e) => setTicket({ ...ticket, message: e.target.value })}/></label>
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
        {!signedIn ? signInPanel : <>
          <form className="panel track-form" onSubmit={(e) => { e.preventDefault(); setTrackHitId(null) }}>
            <label>{t.orderNo}<input value={trackNumber} onChange={(e) => setTrackNumber(e.target.value)} placeholder="AMC-…"/></label>
            <button className="shop-now" type="submit">{t.trackBtn}</button>
          </form>
          {trackedOrder ? <div className="track-card">
            <small>{trackedOrder.number}</small>
            <h3>{t.statusMap[trackedOrder.status] || trackedOrder.status}</h3>
            <p>{trackedOrder.itemName} · {trackedOrder.lineCount} {t.itemsCount} · {trackedOrder.total}</p>
            <ol className="steps">
              {t.steps.map((step, i) => {
                const rank = { Packed: 0, 'In transit': 1, 'Out for delivery': 2, Delivered: 3 }[trackedOrder.status] ?? 0
                return <li key={step} className={rank >= i ? 'done' : ''}>{step}</li>
              })}
            </ol>
          </div> : trackNumber.trim() && <div className="empty-state">{t.noOrder}</div>}
        </>}
      </section>}

      {page === 'notifications' && <section className="section">
        <PageHero kicker={t.tape} title={t.notifH} note={t.notifP}/>
        {/* Built from real orders. There is no notifications endpoint on the farmer API, and a list
            of invented alerts on a page whose whole job is to tell you what happened would be the
            worst possible place for mock data. */}
        {!signedIn ? signInPanel : <Async query={ordersQuery} emptyTitle={t.noOrders} emptyNote={t.noOrdersP}>
          {(list) => <div className="note-list">{list.slice(0, 12).map((o) => (
            <button key={o.id} className="note" onClick={() => go('track', () => { setTrackHitId(o.id); setTrackNumber(o.number) })}>
              <b>{t.statusMap[o.status] || o.status} · {o.number}</b>
              <p>{o.itemName} · {o.total}</p>
              <small>{formatDate(o.placedAt, locale)}</small>
            </button>
          ))}</div>}
        </Async>}
      </section>}

      {page === 'wishlist' && <section className="section">
        <PageHero kicker={t.save} title={t.wishH} note={t.wishP}/>
        {!signedIn ? signInPanel : <Async
          query={wishlistQuery}
          skeleton={<SkeletonGrid count={4}/>}
          emptyTitle={t.nothingSaved}
          emptyAction={<button className="shop-now" onClick={() => openShop()}>{t.browseLots}</button>}
        >
          {(list) => grid(list)}
        </Async>}
      </section>}

      {page === 'account' && <section className="section">
        {!signedIn ? signInPanel : <>
          <PageHero
            kicker={t.member}
            title={auth.user!.fullName}
            note={`${auth.user!.phoneE164 ?? auth.user!.email ?? ''} · ${auth.user!.organisationName}`}
          />
          <div className="product-tabs">
            {([['orders', t.orders], ['profile', t.profile], ['services', t.bookings]] as const).map(([id, label]) => (
              <button key={id} className={acctTab === id ? 'tab-active' : ''} onClick={() => setAcctTab(id)}>{label}</button>
            ))}
          </div>
          {acctTab === 'orders' && <Async query={ordersQuery} emptyTitle={t.noOrders} emptyNote={t.noOrdersP}
            emptyAction={<button className="shop-now" onClick={() => openShop()}>{t.browseLots}</button>}>
            {(list) => <div className="order-list">{list.map((o) => (
              <button key={o.id} className="order-row" onClick={() => go('track', () => { setTrackHitId(o.id); setTrackNumber(o.number) })}>
                <b>{o.number}</b><span>{t.statusMap[o.status] || o.status}</span>
                <small>{formatDate(o.placedAt, locale)} · {o.itemName}</small>
                <em>{o.total}</em>
              </button>
            ))}</div>}
          </Async>}
          {acctTab === 'profile' && <div className="panel">
            <p><b>{t.fullName}</b><br/>{auth.user!.fullName}</p>
            <p><b>{t.phoneOrEmail}</b><br/>{auth.user!.phoneE164 ?? auth.user!.email}</p>
            <p><b>{t.account}</b><br/>{auth.user!.organisationName} · {auth.user!.roles.join(', ')}</p>
            <button className="outline" onClick={() => void auth.signOut()}>{t.signOut}</button>
          </div>}
          {acctTab === 'services' && <Async query={bookingsQuery} emptyTitle={t.noBook}
            emptyAction={<button className="shop-now" onClick={() => go('services')}>{t.openSvc2}</button>}>
            {(list) => <div className="order-list">{list.map((b) => (
              <div key={b.id} className="order-row static">
                <b>{b.serviceName}</b><span>{t.statusMap[b.status] || b.status}</span>
                <small>{b.orderNumber} · {b.scheduledDate ? formatDate(b.scheduledDate, locale) : formatDate(b.placedAt, locale)}</small>
                <em>{b.total.display}</em>
              </div>
            ))}</div>}
          </Async>}
        </>}
      </section>}

      {page === 'checkout' && <section className="section">
        <PageHero kicker={t.settle} title={t.checkH} note={t.checkP}/>
        {!signedIn ? signInPanel : placedOrder ? <div className="panel success">
          <h3>{t.orders} {placedOrder.number} {t.packed}</h3>
          <p>{placedOrder.total}</p>
          <button className="shop-now" onClick={() => { setTrackNumber(placedOrder.number); setPlacedOrder(null); go('track') }}>{t.trackVan}</button>
        </div> : <div className="two-col">
          <form className="panel" onSubmit={(e) => { e.preventDefault(); void placeOrder() }}>
            <label>{t.phone}<input value={checkoutForm.phone} onChange={(e) => setCheckoutForm({ ...checkoutForm, phone: e.target.value })}/></label>
            <label>{t.district}<select value={checkoutForm.geographyId} onChange={(e) => setCheckoutForm({ ...checkoutForm, geographyId: e.target.value })}>
              {(geographyQuery.data ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select></label>
            <label>{t.unionArea}<input value={checkoutForm.addressLine} onChange={(e) => setCheckoutForm({ ...checkoutForm, addressLine: e.target.value })}/></label>
            <label>{t.payWith}<select value={checkoutForm.pay} onChange={(e) => setCheckoutForm({ ...checkoutForm, pay: e.target.value })}>
              {(paymentQuery.data ?? []).map((code) => <option key={code} value={code}>{payLabel(code)}</option>)}
            </select></label>
            <label>{t.note}<textarea rows={3} value={checkoutForm.note} onChange={(e) => setCheckoutForm({ ...checkoutForm, note: e.target.value })}/></label>
            {checkoutError && <p role="alert" className="form-error">{checkoutError}</p>}
            <button className="shop-now" type="submit" disabled={placing || cartCount === 0}>
              {placing ? t.signInBusy : `${t.placeOrder}${cart ? ` · ${cart.total.display}` : ''}`}
            </button>
          </form>
          <aside className="panel">
            <h3>{t.bag}</h3>
            {cart && cart.itemCount > 0
              ? cart.sellers.flatMap((s) => s.items).map((item) => (
                <p key={item.id}>{item.name} × {item.quantity} <b>{item.lineTotal.display}</b></p>
              ))
              : <p>{t.cartEmpty}</p>}
            <hr/>
            {cart && <>
              <p>{t.subtotal} <b>{cart.subtotal.display}</b></p>
              {cart.discountTotal.amountMinor > 0 && <p>{t.discount} <b>−{cart.discountTotal.display}</b></p>}
              <p>{t.total} <b>{cart.total.display}</b></p>
            </>}
            {cartCount === 0 && <button className="text-link" onClick={() => openShop()}>{t.addFirst}</button>}
          </aside>
        </div>}
      </section>}
    </main>

    {cartOpen && <CartDrawer cart={cart} busyItemId={busyItemId} t={t}
      onClose={() => setCartOpen(false)} onQty={changeQty} onRemove={removeLine}
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

function SignInForm({ t, restoring, onSignIn, onRegister }: {
  t: typeof i18n.en
  restoring: boolean
  onSignIn: (identifier: string, password: string) => Promise<void>
  onRegister: (fullName: string, identifier: string, password: string) => Promise<void>
}) {
  const [mode, setMode] = useState<'signIn' | 'register'>('signIn')
  const [fullName, setFullName] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (restoring) return <div className="panel"><p>{t.checking}</p></div>

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'signIn') await onSignIn(identifier.trim(), password)
      else await onRegister(fullName.trim(), identifier.trim(), password)
      // Cleared on success so a password never lingers in component state behind the next screen.
      setPassword('')
    } catch (cause) {
      // The API's own message, verbatim. It already distinguishes a wrong password from a locked
      // account, and rewriting every 401 as "please sign in again" is how a locked account came to
      // look like a broken login form once before.
      setError(cause instanceof ApiError ? cause.detail : t.loadFailed)
    } finally {
      setBusy(false)
    }
  }

  return <div className="panel auth-panel">
    <h3>{mode === 'signIn' ? t.signInH : t.createAccount}</h3>
    <p className="muted">{t.signInP}</p>
    <form onSubmit={submit}>
      {mode === 'register' && <label>{t.fullName}
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" required/>
      </label>}
      <label>{t.phoneOrEmail}
        <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" required/>
      </label>
      <label>{t.password}
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
               autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'} required/>
      </label>
      {error && <p role="alert" className="form-error">{error}</p>}
      <button className="shop-now" type="submit" disabled={busy}>
        {busy ? t.signInBusy : mode === 'signIn' ? t.signInCta : t.registerCta}
      </button>
    </form>
    <button className="text-link" type="button" onClick={() => { setMode(mode === 'signIn' ? 'register' : 'signIn'); setError(null) }}>
      {mode === 'signIn' ? t.newHere : t.haveAccount}
    </button>
  </div>
}
