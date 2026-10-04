import { Notifications } from './Notifications'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import farmerHero from './assets/farmer-hero.jpg'
import { payKeys, topicKeys, type Page } from './data'
import { i18n } from './i18n'
import { onPushMessage, registerPush } from './push'
import { CartDrawer, PageHero, PriceTicker, ProductCard, pad } from './ui'
import { SiteHeader, type NavItem } from './components/SiteHeader'
import { SiteFooter } from './components/SiteFooter'
import { CatalogHeader, CategorySheet, FilterBar, type ActiveFilter } from './components/Catalog'
import { useMediaQuery } from './components/hooks'
import * as api from './api/endpoints'
import { TaxonomyBrowser, emptySelection, deepestLabel, hasSelection, type TaxonomySelection } from './TaxonomyBrowser'
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

const API_LOCALE: Record<Lang, 'en-US' | 'bn-BD'> = { en: 'en-US', bn: 'bn-BD' }

const navMap: Record<string, Page> = {
  Home: 'home', Shop: 'shop', Categories: 'shop', Brands: 'brands',
  Services: 'services', Offers: 'offers', Knowledge: 'knowledge', Support: 'support',
  হোম: 'home', দোকান: 'shop', ক্যাটাগরি: 'shop', ব্র্যান্ড: 'brands',
  সেবা: 'services', অফার: 'offers', জ্ঞান: 'knowledge', সহায়তা: 'support',
}

function tabFilters(tab: string): Partial<api.SearchArgs> {
  if (tab === 'best') return { sort: 'rating' }
  if (tab === 'new') return { sort: 'newest' }
  if (tab === 'sale') return { onOfferOnly: true }
  return {}
}

export default function App() {

  const [page, setPage] = useState<Page>(() => {
    try {
      return new URLSearchParams(window.location.search).get('view') === 'notifications'
        ? 'notifications'
        : 'home'
    } catch {
      return 'home'
    }
  })
  const [lang, setLang] = useState<Lang>('en')
  const [inboxRevision, setInboxRevision] = useState(0)
  const [categorySheet, setCategorySheet] = useState(false)
  const wideCatalog = useMediaQuery('(min-width: 1024px)')
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  // The three taxonomy tiers, applied progressively. Replaces the single flat
  // `category`, which could only ever express one level of a three-level tree.
  const [taxonomy, setTaxonomy] = useState<TaxonomySelection>(() => {
    // A shared link carries ids only. TaxonomyChips notices the names are
    // missing and fills them from /categories/{id}/breadcrumb.
    const p = new URLSearchParams(window.location.search)
    return {
      ...emptySelection,
      divisionId: p.get('division_id') ?? '',
      categoryId: p.get('category_id') ?? '',
      subcategoryId: p.get('subcategory_id') ?? '',
    }
  })

  // Keep the address bar in step, so the filtered list is shareable and
  // survives a reload. replaceState, not pushState: narrowing a filter is not
  // a navigation, and Back should leave the shop rather than walk the filter
  // history one chip at a time.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    for (const [k, v] of [
      ['division_id', taxonomy.divisionId],
      ['category_id', taxonomy.categoryId],
      ['subcategory_id', taxonomy.subcategoryId],
    ] as const) {
      if (v) p.set(k, v); else p.delete(k)
    }
    const qs = p.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
  }, [taxonomy.divisionId, taxonomy.categoryId, taxonomy.subcategoryId])
  const [tab, setTab] = useState('all')
  const [brandFilter, setBrandFilter] = useState('')
  const [activeIngredientSort, setActiveIngredientSort] = useState<'none' | 'asc' | 'desc'>('none')
  const [activeIngredientPriceMax, setActiveIngredientPriceMax] = useState('')
  const [productId, setProductId] = useState<string | null>(null)
  const [articleSlug, setArticleSlug] = useState<string | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const checkoutIdempotencyKey = useRef<string | null>(null)
  const [compareIds, setCompareIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('agromed.compare') ?? '[]') as string[] } catch { return [] }
  })
  const [busyItemId, setBusyItemId] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const [showTop, setShowTop] = useState(false)
  const [bump, setBump] = useState(false)
  const [faqOpen, setFaqOpen] = useState(0)
  const [trackNumber, setTrackNumber] = useState('')
  const [trackHitId, setTrackHitId] = useState<string | null>(null)
  const [acctTab, setAcctTab] = useState<'orders' | 'profile' | 'services' | 'cases' | 'reviews'>('orders')
  const [caseForm, setCaseForm] = useState({ orderId: '', orderLineId: '', quantity: '1', reason: 'damaged', category: 'quality', description: '' })
  const [reviewForm, setReviewForm] = useState({ orderLineId: '', rating: '5', body: '', effectiveness: '5', valueForMoney: '5', packaging: '5', authenticity: '5' })
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null)
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null)
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null)
  const [checkoutForm, setCheckoutForm] = useState({ addressLine: '', phone: '', geographyId: '', pay: '', note: '' })
  const [placedOrder, setPlacedOrder] = useState<{ number: string; total: string } | null>(null)
  const [placing, setPlacing] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [ticket, setTicket] = useState({ name: '', topic: 'Delivery', message: '' })
  const [tickets, setTickets] = useState<{ id: string; topic: string }[]>([])
  const [serviceForm, setServiceForm] = useState({ crop: '', geographyId: '', phone: '' })

  const auth = useAuth()
  const t = i18n[lang]
  const bn = lang === 'bn'
  const signedIn = auth.status === 'authenticated'

  if (getLocale() !== API_LOCALE[lang]) setLocale(API_LOCALE[lang])
  const locale = API_LOCALE[lang]

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2400)
  }, [])

  const go = (next: Page, extra?: () => void) => {
    extra?.()
    setPage(next)
    setCartOpen(false)
    setCategorySheet(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  // Stable identities: the drawer/sheet effects re-run when these change.
  const closeCart = useCallback(() => setCartOpen(false), [])
  const closeCategorySheet = useCallback(() => setCategorySheet(false), [])

  const pushUserId = auth.user?.id ?? null
  useEffect(() => {
    if (!pushUserId) return
    void registerPush(pushUserId)
  }, [pushUserId])

  useEffect(() => {
    const stop = onPushMessage(() => setInboxRevision(n => n + 1))
    const onServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'agromed:open-notifications') go('notifications')
    }
    navigator.serviceWorker?.addEventListener('message', onServiceWorkerMessage)
    return () => {
      stop()
      navigator.serviceWorker?.removeEventListener('message', onServiceWorkerMessage)
    }

  }, [])

  const categoriesQuery = useQuery(`categories|${locale}`, (signal) =>
    api.getCategories(signal).then(toCategories))

  const shopQuery = useQuery(
    `search|${locale}|${query}|${taxonomy.divisionId}|${taxonomy.categoryId}|${taxonomy.subcategoryId}|${tab}|${brandFilter}|${activeIngredientSort}|${activeIngredientPriceMax}`,
    (signal) => api.search({
      text: query || undefined,
      divisionId: taxonomy.divisionId || undefined,
      categoryId: taxonomy.categoryId || undefined,
      subcategoryId: taxonomy.subcategoryId || undefined,
      brand: brandFilter || undefined,
      maxActiveIngredientPriceMinor: Number.isFinite(Number(activeIngredientPriceMax)) && Number(activeIngredientPriceMax) > 0
        ? Math.round(Number(activeIngredientPriceMax) * 100) : undefined,
      limit: 48,
      ...tabFilters(tab),
      sort: activeIngredientSort === 'none' ? undefined : `active_ingredient_price_${activeIngredientSort}`,
    }, signal).then((r) => r.items.map(toProduct)),
  )

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
  const articleQuery = useQuery(`article|${locale}|${articleSlug}`, signal =>
    articleSlug ? api.getArticle(articleSlug, signal) : Promise.reject(new Error('article_missing')),
    { enabled: page === 'article' && articleSlug !== null })

  const faqsQuery = useQuery(`faqs|${locale}`, (signal) => api.getFaqs(undefined, signal))

  const offersQuery = useQuery(`offers|${locale}`, (signal) =>
    api.search({ onOfferOnly: true, limit: 24 }, signal).then((r) => r.items.map(toProduct)))

  const paymentQuery = useQuery(`payments|${locale}`, (signal) => api.getPaymentMethods(signal))

  const geographyQuery = useQuery(`geographies|${locale}`, (signal) =>
    api.getGeographies(signal).then((rows) => {

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
  const equivalentsQuery = useQuery(
    `equivalents|${locale}|${productId}`,
    (signal) => productId ? api.getEquivalents(productId, signal) : Promise.resolve({ items: [] }),
    { enabled: productId !== null, isEmpty: (result) => result.items.length === 0 },
  )
  const reviewsQuery = useQuery(
    `reviews|${locale}|${productId ?? ''}`,
    (signal) => productId ? api.getReviews(productId, signal).then((r) => r.items) : Promise.resolve([]),
    { enabled: productId !== null, isEmpty: (items) => items.length === 0 },
  )
  const comparisonQuery = useQuery(
    `compare|${locale}|${compareIds.join(',')}`,
    (signal) => api.compareListings(compareIds, signal),
    { enabled: page === 'compare' && compareIds.length >= 2 },
  )

  const relatedQuery = useQuery(
    `related|${locale}|${productId ?? ''}`,
    (signal) => api.getSuggestions(productId!, signal).then((list) => list.map(toProduct)),
    { enabled: productId !== null },
  )

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
  const returnsQuery = useQuery(`returns|${locale}|${signedIn}`, (signal) => api.getReturns(signal).then((r) => r.items), { enabled: signedIn, isEmpty: (v) => v.length === 0 })
  const disputesQuery = useQuery(`disputes|${locale}|${signedIn}`, (signal) => api.getDisputes(signal).then((r) => r.items), { enabled: signedIn, isEmpty: (v) => v.length === 0 })
  const myReviewsQuery = useQuery(`my-reviews|${locale}|${signedIn}`, (signal) => api.getMyReviews(signal).then((r) => r.items), { enabled: signedIn, isEmpty: (v) => v.length === 0 })
  const caseOrderQuery = useQuery(`case-order|${locale}|${caseForm.orderId}`, (signal) => api.getOrder(caseForm.orderId, signal), { enabled: signedIn && acctTab === 'cases' && caseForm.orderId.length > 0 })
  const returnDetailQuery = useQuery(`return-detail|${locale}|${selectedReturnId ?? ''}`, (signal) => api.getReturn(selectedReturnId!, signal), { enabled: selectedReturnId !== null })
  const disputeDetailQuery = useQuery(`dispute-detail|${locale}|${selectedDisputeId ?? ''}`, (signal) => api.getDispute(selectedDisputeId!, signal), { enabled: selectedDisputeId !== null })

  const cart = cartQuery.data
  const cartCount = cart?.itemCount ?? 0
  const wishlistIds = useMemo(
    () => new Set((wishlistQuery.data ?? []).map((p) => p.id)),
    [wishlistQuery.data],
  )

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
  const toggleCompare = (id: string) => setCompareIds(current => {
    const next = current.includes(id) ? current.filter(x => x !== id) : current.length < 4 ? [...current, id] : current
    localStorage.setItem('agromed.compare', JSON.stringify(next)); return next
  })
  const openShop = (cat = 'all', nextTab = 'all', brand = '') =>
    go('shop', () => { setTaxonomy({ ...emptySelection, divisionId: cat === 'all' ? '' : cat, divisionName: cat === 'all' ? '' : (categoriesQuery.data?.find((c) => c.id === cat)?.name ?? '') }); setTab(nextTab); setBrandFilter(brand); setQuery('') })

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
      checkoutIdempotencyKey.current ??= crypto.randomUUID()
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
      }, checkoutIdempotencyKey.current)
      setPlacedOrder({ number: order.orderNumber, total: order.grandTotal.display })
      cartQuery.reload()
      ordersQuery.reload()
      showToast(`${t.orderPlaced} ${order.orderNumber}`)
      checkoutIdempotencyKey.current = null
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

    const id = `T-${Date.now().toString().slice(-4)}`
    setTickets((x) => [{ id, topic: ticket.topic }, ...x])
    setTicket((prev) => ({ ...prev, message: '' }))
    showToast(`${t.ticketOpened} ${id} — ${t.ticketLocal}`)
  }

  const trackedOrder = useMemo(() => {
    const orders = ordersQuery.data ?? []
    if (trackHitId) return orders.find((o) => o.id === trackHitId) ?? null
    const needle = trackNumber.trim().toLowerCase()
    if (!needle) return null
    return orders.find((o) => o.number.toLowerCase() === needle) ?? null
  }, [ordersQuery.data, trackHitId, trackNumber])

  // Two booleans only (header shadow, back-to-top), so React bails out of
  // re-rendering on every scroll frame once each has settled.
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 8)
      setShowTop(y > 520)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!auth.user) return
    const phone = auth.user.phoneE164 ?? ''
    setCheckoutForm((f) => (f.phone ? f : { ...f, phone }))
    setServiceForm((f) => (f.phone ? f : { ...f, phone }))
    setTicket((f) => (f.name ? f : { ...f, name: auth.user!.fullName }))
  }, [auth.user])

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

  const navKey = (label: string) => navMap[label] || 'home'
  const activeNav = (label: string) => {
    const target = navKey(label)
    if (target === 'shop') return page === 'shop' || page === 'product'
    if (target === 'knowledge') return page === 'knowledge' || page === 'article'
    if (target === 'support') return page === 'support' || page === 'help' || page === 'track'
    return page === target
  }

  const signInPanel = <SignInForm
    t={t}
    restoring={auth.status === 'restoring'}
    onSignIn={auth.signIn}
    onRegister={auth.register}
  />

  const grid = (list: ProductView[]) => <div className="products">{list.map((p) => (
    <ProductCard key={p.id} product={p} t={t} wishlisted={wishlistIds.has(p.id)}
      onWishlist={() => toggleWish(p.id)} onCart={() => addToCart(p)} onOpen={() => openProduct(p)}/>
  ))}</div>

  const filtersApplied = hasSelection(taxonomy) || Boolean(query || brandFilter)
  const clearFilters = () => { setQuery(''); setDraft(''); setTaxonomy(emptySelection); setTab('all'); setBrandFilter(''); setActiveIngredientSort('none'); setActiveIngredientPriceMax('') }
  // The picker reports the deepest tier's name, so the heading needs no extra
  // lookup -- and works for a subcategory, which the flat CategoryView has no
  // way to name.
  const shopTitle = brandFilter || deepestLabel(taxonomy) || t.allInputs
  const shopNote = query ? `${t.resultsFor} “${query}”` : t.shopNote

  // Removable chips for whatever narrows the list right now.
  const activeFilters: ActiveFilter[] = [
    query && { key: 'q', label: `“${query}”`, onRemove: () => { setQuery(''); setDraft('') } },
    hasSelection(taxonomy) && { key: 'cat', label: deepestLabel(taxonomy) || t.allCats, onRemove: () => setTaxonomy(emptySelection) },
    brandFilter && { key: 'brand', label: brandFilter, onRemove: () => setBrandFilter('') },
  ].filter((f): f is ActiveFilter => Boolean(f))

  const payLabel = (code: string) => {
    const i = payKeys.indexOf(code as (typeof payKeys)[number])
    if (i >= 0) return t.pays[i]
    return code.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
  }
  const topicLabel = (key: string) => {
    const i = topicKeys.indexOf(key as (typeof topicKeys)[number])
    return i >= 0 ? t.topics[i] : key
  }

  const toggleLang = () => setLang(lang === 'en' ? 'bn' : 'en')
  const navItems: NavItem[] = t.nav.map((label) => ({
    label,
    current: activeNav(label),
    hot: label === 'Offers' || label === 'অফার',
    onSelect: () => {
      if (label === 'Categories' || label === 'ক্যাটাগরি') openShop('all')
      else go(navKey(label))
    },
  }))

  const taxonomyPicker = <TaxonomyBrowser
    value={taxonomy}
    onChange={(next) => { setTaxonomy(next); setBrandFilter('') }}
    allLabel={t.allCats}
    locale={locale}
  />

  return <div className="shell" lang={bn ? 'bn' : 'en'}>
    <a className="skip-link" href="#main">Skip to content</a>
    {toast && <div className="toast" role="status">✓ {toast}</div>}

    <SiteHeader
      t={t}
      scrolled={scrolled}
      langLabel={lang === 'en' ? 'বাংলা' : 'EN'}
      onToggleLang={toggleLang}
      onHelp={() => go('help')}
      onTrack={() => go('track')}
      onHome={() => go('home')}
      navItems={navItems}
      categories={categoriesQuery.data ?? []}
      onPickCategory={(id) => openShop(id)}
      searchDraft={draft}
      onSearchDraft={setDraft}
      onSearch={() => { setQuery(draft); go('shop') }}
      onNotifications={() => go('notifications')}
      onWishlist={() => go('wishlist')}
      wishCount={wishlistIds.size}
      onCart={() => (signedIn ? setCartOpen(true) : requireSignIn())}
      cartCount={cartCount}
      bump={bump}
      accountName={auth.status === 'restoring' ? '…' : auth.user?.fullName ?? t.signIn}
      onAccount={() => go('account')}
    />
    <PriceTicker items={tickerQuery.data ?? []} label={t.market}/>

    <main id="main" tabIndex={-1}>
      {page === 'home' && <>
        <section className="hero">
          <div className="container">
            <div className="hero-copy">
              <span className="eyebrow">{t.eyebrow}</span>
              <h1>{t.headline1} <strong>{t.headline2}</strong></h1>
              <p>{t.heroP}</p>
              <div className="hero-actions">
                <button type="button" className="btn btn-primary" onClick={() => openShop()}>{t.shopNow} →</button>
                <button type="button" className="btn btn-outline" onClick={() => go('services')}>{t.explore}</button>
              </div>
              <p className="hero-trust">{t.heroTrust}</p>
            </div>
            <div className="hero-media">
              <img src={farmerHero} alt="" width={1672} height={941} fetchPriority="high"/>
              <button type="button" className="hero-tag" onClick={() => openShop('all', 'sale')}><b>{t.heroSave}</b><span>{t.heroSaveNote}</span></button>
            </div>
          </div>
        </section>

        <div className="container">
          <div className="feature-strip">{t.features.map((row, i) => (
            <button key={row[0]} type="button" onClick={() => go(i === 2 ? 'services' : i === 3 ? 'checkout' : 'shop')}>
              <span aria-hidden>{['64', 'OK', 'AG', '৳'][i]}</span><p><b>{row[0]}</b>{row[1]}</p>
            </button>
          ))}</div>
        </div>

        <section className="section">
          <div className="heading"><div><span className="eyebrow green">{t.shopNeed}</span><h2>{t.shopNeedH}</h2><p>{t.shopNeedP}</p></div><button type="button" className="text-link" onClick={() => openShop()}>{t.openShop}</button></div>
          <Async query={categoriesQuery} skeleton={<SkeletonGrid count={6}/>} emptyTitle={t.noProducts}>
            {(list) => <div className="category-grid">{list.map((c) => (
              <button key={c.id} type="button" className="category" onClick={() => openShop(c.id)}>
                <i>{c.index}</i><span className="category-text"><b>{c.name}</b><small>{c.childNames}</small></span><span className="category-arrow" aria-hidden>→</span>
              </button>
            ))}</div>}
          </Async>
        </section>

        <div className="container">
          <section className="offer on-dark">
            <div>
              <span className="eyebrow">{t.flash}</span>
              <h2>{t.flashH}</h2>
              <p>{t.flashP}</p>
              <button type="button" className="btn btn-accent" onClick={() => openShop('all', 'sale')}>{t.shopSale}</button>
            </div>
            <div className="offer-stat">
              <p className="offer-big">{t.upTo}<strong>30%</strong>{t.off}</p>
              <div className="countdown" role="timer" aria-label={t.remaining}>
                {([[rDays, 'd'], [rHours, 'h'], [rMins, 'm'], [rSecs, 's']] as const).map(([v, u]) => <span key={u}>{pad(v)}<small>{u}</small></span>)}
              </div>
            </div>
          </section>
        </div>

        <section className="section">
          <div className="heading"><div><span className="eyebrow green">{t.picks}</span><h2>{t.picksH}</h2><p>{t.picksP}</p></div>
            <div className="seg" role="group" aria-label={t.picks}>
              {[['all', t.tabAll], ['best', t.tabBest], ['new', t.tabNew]].map(([id, label]) => (
                <button key={id} type="button" aria-pressed={tab === id} onClick={() => openShop('all', id)}>{label}</button>
              ))}
            </div>
          </div>
          <Async query={featuredQuery} emptyTitle={t.noProducts} emptyNote={t.noProductsP}>
            {(list) => grid(list)}
          </Async>
          <button type="button" className="btn btn-outline view-products" onClick={() => openShop()}>{t.viewAll}</button>
        </section>

        <section className="section brand-strip">
          <div className="brand-intro">
            <span className="eyebrow">{t.brandEyebrow}</span>
            <h2>{t.brandH}</h2>
            <p>{t.brandP}</p>
            <ul className="brand-stats">
              <li>{t.since}</li>
              <li>{t.hq}</li>
              <li>{t.districts64}</li>
              <li>{t.farmers}</li>
            </ul>
          </div>
          <div className="trust-grid">{t.trust.map((row, i) => (
            <article key={row[0]}>
              <i>{['01', '02', '03', '04'][i]}</i>
              <b>{row[0]}</b>
              <p>{row[1]}</p>
            </article>
          ))}</div>
        </section>

        <div className="services-band on-dark">
          <section className="section">
            <div className="service-copy">
              <span className="eyebrow">{t.fieldSvc}</span>
              <h2>{t.svcH1} <strong>{t.svcH2}</strong></h2>
              <p>{t.svcP}</p>
              <button type="button" className="btn btn-accent" onClick={() => go('services')}>{t.openSvc}</button>
            </div>
            <Async query={servicesQuery} skeleton={<SkeletonGrid count={4}/>} emptyTitle={t.noServices}>
              {(list) => <div className="service-cards">{list.slice(0, 4).map((s) => (
                <button key={s.id} type="button" className="service-card" onClick={() => go('services')}>
                  <i>{s.index}</i><b>{s.name}</b><small>{s.price} · {s.categoryName}</small>
                </button>
              ))}</div>}
            </Async>
          </section>
        </div>
      </>}

      {page === 'shop' && <section className="section shop-page">
        <CatalogHeader kicker={t.catalog} title={shopTitle} note={shopNote}/>
        <FilterBar
          t={t}
          tabs={[['all', t.tabAll], ['best', t.tabBest], ['new', t.tabNewFull], ['sale', t.tabSale]]}
          tab={tab}
          onTab={setTab}
          onOpenCategories={wideCatalog ? undefined : () => setCategorySheet(true)}
          active={activeFilters}
          onClearAll={clearFilters}
          controls={<>
            <label className="sr-only" htmlFor="ingredient-price-sort">Sort by active ingredient price</label>
            <select id="ingredient-price-sort" value={activeIngredientSort} onChange={(e) => setActiveIngredientSort(e.target.value as 'none' | 'asc' | 'desc')}>
              <option value="none">Standard sorting</option>
              <option value="asc">Lowest price / active ingredient</option>
              <option value="desc">Highest price / active ingredient</option>
            </select>
            <label className="sr-only" htmlFor="ingredient-price-max">Maximum price per gram</label>
            <input id="ingredient-price-max" inputMode="decimal" value={activeIngredientPriceMax} onChange={(e) => setActiveIngredientPriceMax(e.target.value)} placeholder="Max price / g"/>
          </>}
        />
        <div className="catalog-layout">
          {wideCatalog && <aside className="catalog-aside" aria-labelledby="catalog-aside-title">
            <h2 id="catalog-aside-title" className="aside-title">{t.allCats}</h2>
            {taxonomyPicker}
          </aside>}
          <div className="catalog-results" aria-live="polite">
            <Async
              query={shopQuery}
              skeleton={<SkeletonGrid count={8}/>}
              emptyTitle={t.noProducts}
              emptyNote={filtersApplied
                ? `Nothing matches ${deepestLabel(taxonomy) || t.allInputs} with the filters applied.`
                : t.noProductsP}
              emptyAction={filtersApplied
                ? <button type="button" className="btn btn-primary" onClick={clearFilters}>{t.clear}</button>
                : undefined}
            >
              {(list) => grid(list)}
            </Async>
          </div>
        </div>
        {!wideCatalog && <CategorySheet t={t} open={categorySheet} onClose={closeCategorySheet}>{taxonomyPicker}</CategorySheet>}
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
                  {product.unit ? ` · ${product.unit}` : ''}
                  {product.normalizedUnitPrice ? ` · ${product.normalizedUnitPrice}` : ''} · {t.sku} {product.sku}
                  {product.activeIngredientPrice ? ` · ${product.activeIngredientPrice}` : ''}
                </p>
                <p>{product.description}</p>
                <div className="price big"><b>{product.price}</b>{product.originalPrice ? <del>{product.originalPrice}</del> : null}</div>
                <p className="stock">{t.seller}: {product.sellerName}</p>
                <div className="pdp-actions">
                  <button className="btn btn-primary" onClick={() => addToCart(product)} disabled={product.stockSignal === 'out_of_stock'}>{t.addCart}</button>
                  <button className="btn btn-outline" onClick={() => { addToCart(product); go('checkout') }} disabled={product.stockSignal === 'out_of_stock'}>{t.buyNow}</button>
                  <button className={wishlistIds.has(product.id) ? 'btn btn-ghost on' : 'btn btn-ghost'} onClick={() => toggleWish(product.id)}>{wishlistIds.has(product.id) ? t.saved : t.save}</button>
                  <button className="btn btn-outline" onClick={() => toggleCompare(product.id)}>{compareIds.includes(product.id) ? 'Remove comparison' : 'Compare'}</button>
                </div>
                {product.attributes.length > 0 && <div className="chip-row tight">
                  {product.attributes.map((a) => <span key={a.label} className="chip static">{a.label}: {a.value}</span>)}
                </div>}
              </div>
            </div>
            {product.usage.length > 0 && <div className="panel usage">
              {product.usage.map((u) => <div key={u.heading}><h4>{u.heading}</h4><p>{u.body}</p></div>)}
            </div>}
            <section className="panel"><h3 className="subhead">Reviews</h3><Async query={reviewsQuery} emptyTitle="No published reviews yet" emptyNote="Verified reviews appear here after moderation.">{(reviews) => <div className="order-list">{reviews.map((review) => <article className="order-row static" key={review.id}><b>{review.rating}/5 · {review.authorName || 'Buyer'}</b><small>{review.body}</small>{review.sellerReply && <small>Seller reply: {review.sellerReply}</small>}</article>)}</div>}</Async></section>
            <h3 className="subhead">{t.also}</h3>
            <Async query={relatedQuery} emptyTitle={t.noProducts}>{(list) => grid(list)}</Async>
            <Async query={equivalentsQuery} emptyTitle="">
              {(response) => response.items.length > 1 && <section className="panel"><h3 className="subhead">Equivalent products</h3>
                {grid(response.items.filter((x) => x.listing.id !== product.id).map((x) => ({ ...toProduct(x.listing), price: x.unitPrice?.display ?? '—' })))}</section>}
            </Async>
          </>}
        </Async>
      </section>}

      {compareIds.length > 0 && page !== 'compare' && <button type="button" className="btn btn-primary compare-fab" onClick={() => go('compare')}>Compare ({compareIds.length})</button>}
      {page === 'compare' && <section className="section"><PageHero kicker="Compare" title="Product comparison" note="Compare up to four products using current prices and availability."/>
        {compareIds.length < 2 ? <p>Select at least two products to compare.</p> : <Async query={comparisonQuery} emptyTitle={t.noProducts}>{result => <>
          <button className="btn btn-outline" onClick={() => { setCompareIds([]); localStorage.removeItem('agromed.compare') }}>Clear comparison</button>
          <div className="panel compare-table"><table><thead><tr><th>Attribute</th>{result.listings.map(l => <th key={l.id}>{l.name}<button onClick={() => toggleCompare(l.id)}>Remove</button></th>)}</tr></thead><tbody>{result.rows.map(row => <tr key={row.code}><th>{row.label}</th>{row.values.map((v, i) => <td key={i}>{v ?? '—'}</td>)}</tr>)}</tbody></table></div>
        </>}</Async>}
      </section>}

      {page === 'brands' && <section className="section">
        <PageHero kicker={t.partners} title={t.brandsH} note={t.brandsP}/>
        <Async query={brandsQuery} skeleton={<SkeletonGrid count={6}/>} emptyTitle={t.noBrands}>
          {(list) => <div className="brand-grid">{list.map((b) => (
            <button key={b.name} className="brand-card" onClick={() => openShop('all', 'all', b.name)}>
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
            <article key={s.id} className="service-row">
              <i>{s.index}</i>
              <div><h3>{s.name}</h3><p>{s.note}</p></div>
              <b>{s.price}</b>
              <button className="btn btn-outline" onClick={() => void bookService(s.id)}>{t.book}</button>
            </article>
          ))}</div>}
        </Async>
      </section>}

      {page === 'offers' && <section className="section">
        <PageHero kicker={t.windows} title={t.offersH} note={t.offersP}/>
        <div className="offer compact on-dark">
          <div><span className="eyebrow">{t.monsoon}</span><h2>{t.cropCareOff}</h2><p>{pad(rDays)}d {pad(rHours)}h {pad(rMins)}m {pad(rSecs)}s {t.remaining}</p>
            <button type="button" className="btn btn-accent" onClick={() => openShop('all', 'sale')}>{t.openSale}</button></div>
        </div>
        <Async query={offersQuery} skeleton={<SkeletonGrid count={4}/>} emptyTitle={t.noProducts} emptyNote={t.noProductsP}>
          {(list) => grid(list)}
        </Async>
      </section>}

      {page === 'knowledge' && <section className="section">
        <PageHero kicker={t.notes} title={t.knowH} note={t.knowP}/>
        <Async query={articlesQuery} skeleton={<SkeletonGrid count={6}/>} emptyTitle={t.noArticles}>
          {(list) => <div className="article-grid">{list.map((a) => (
            <button key={a.id} className="article-card" onClick={() => go('article', () => { setArticleSlug(a.slug) })}>
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
        <Async query={articleQuery} emptyTitle={t.noArticles}>
          {(article) => {
            return <>
              <small className="eyebrow">{article.category} · {article.minutesRead} {t.minRead}</small>
              <h1>{article.title}</h1>
              <p className="lead">{article.summary}</p>
              <div className="article-body">{article.body.split(/\n{2,}/).map((paragraph: string, i: number) => <p key={i}>{paragraph}</p>)}</div>
              <small className="muted">{formatDate(article.publishedAt, locale)}</small>
              <button className="btn btn-primary" onClick={() => go('services')}>{t.askAgro}</button>
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
            <button className="btn btn-primary" type="submit">{t.sendDesk}</button>
            {tickets[0] && <p className="ok">{t.latestTicket} {tickets[0].id} · {topicLabel(tickets[0].topic)}<br/><small>{t.ticketLocal}</small></p>}
          </form>
          <div>
            <Async query={faqsQuery} skeleton={<SkeletonGrid count={3}/>} emptyTitle={t.helpH} emptyNote={t.helpP}>
              {(list) => <>{list.map((f, i) => (
                <button key={f.id} type="button" className="faq" aria-expanded={faqOpen === i} onClick={() => setFaqOpen(faqOpen === i ? -1 : i)}>
                  <b>{f.question}</b>{faqOpen === i && <p>{f.answer}</p>}
                </button>
              ))}</>}
            </Async>
            <button className="text-link" onClick={() => go('track')}>{t.trackOrder}</button>
          </div>
        </div>
      </section>}

      {page === 'track' && <section className="section">
        <PageHero kicker={t.vans} title={t.trackH} note={t.trackP}/>
        {!signedIn ? signInPanel : <>
          <form className="panel track-form" onSubmit={(e) => { e.preventDefault(); setTrackHitId(null) }}>
            <label>{t.orderNo}<input value={trackNumber} onChange={(e) => setTrackNumber(e.target.value)} placeholder="AMC-…"/></label>
            <button className="btn btn-primary" type="submit">{t.trackBtn}</button>
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
        {!signedIn ? signInPanel : <Notifications key={auth.status} locale={locale} revision={inboxRevision}/>}
      </section>}

      {page === 'wishlist' && <section className="section">
        <PageHero kicker={t.save} title={t.wishH} note={t.wishP}/>
        {!signedIn ? signInPanel : <Async
          query={wishlistQuery}
          skeleton={<SkeletonGrid count={4}/>}
          emptyTitle={t.nothingSaved}
          emptyAction={<button className="btn btn-primary" onClick={() => openShop()}>{t.browseLots}</button>}
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
          <div className="seg" role="group" aria-label={t.member}>
            {([['orders', t.orders], ['profile', t.profile], ['services', t.bookings], ['cases', 'Returns & disputes'], ['reviews', 'My reviews']] as const).map(([id, label]) => (
              <button key={id} type="button" aria-pressed={acctTab === id} onClick={() => setAcctTab(id)}>{label}</button>
            ))}
          </div>
          {acctTab === 'orders' && <Async query={ordersQuery} emptyTitle={t.noOrders} emptyNote={t.noOrdersP}
            emptyAction={<button className="btn btn-primary" onClick={() => openShop()}>{t.browseLots}</button>}>
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
            <button className="btn btn-outline" onClick={() => void auth.signOut()}>{t.signOut}</button>
          </div>}
          {acctTab === 'services' && <Async query={bookingsQuery} emptyTitle={t.noBook}
            emptyAction={<button className="btn btn-primary" onClick={() => go('services')}>{t.openSvc2}</button>}>
            {(list) => <div className="order-list">{list.map((b) => (
              <div key={b.id} className="order-row static">
                <b>{b.serviceName}</b><span>{t.statusMap[b.status] || b.status}</span>
                <small>{b.orderNumber} · {b.scheduledDate ? formatDate(b.scheduledDate, locale) : formatDate(b.placedAt, locale)}</small>
                <em>{b.total.display}</em>
              </div>
            ))}</div>}
          </Async>}
          {acctTab === 'cases' && <div className="two-col">
            <form className="panel" onSubmit={(e) => { e.preventDefault(); void mutate(null, () => api.createReturn(caseForm.orderId, { orderLineId: caseForm.orderLineId, quantity: Number(caseForm.quantity), reasonCode: caseForm.reason }), () => { returnsQuery.reload(); setCaseForm((f) => ({ ...f, orderLineId: '' })) }) }}>
              <h3>Request a return</h3><p>Choose a delivered order line. Sealed regulated items are checked by the server.</p>
              <label>Order<select required value={caseForm.orderId} onChange={(e) => setCaseForm({ ...caseForm, orderId: e.target.value, orderLineId: '' })}><option value="">Select delivered order</option>{(ordersQuery.data ?? []).map((order) => <option key={order.id} value={order.id}>{order.number}</option>)}</select></label>
              <label>Order line<select required disabled={caseOrderQuery.status !== 'ready'} value={caseForm.orderLineId} onChange={(e) => setCaseForm({ ...caseForm, orderLineId: e.target.value })}><option value="">{caseOrderQuery.status === 'loading' ? 'Loading order lines…' : 'Select item'}</option>{(caseOrderQuery.data?.lines ?? []).filter((line) => line.quantity > line.returnedQuantity).map((line) => <option key={line.id} value={line.id}>{line.nameSnapshot}</option>)}</select></label>
              <label>Quantity<input required type="number" min="1" value={caseForm.quantity} onChange={(e) => setCaseForm({ ...caseForm, quantity: e.target.value })}/></label>
              <label>Reason<select value={caseForm.reason} onChange={(e) => setCaseForm({ ...caseForm, reason: e.target.value })}>{['damaged','wrong_item','expired','not_as_described','quality_issue','late_delivery','changed_mind','regulatory'].map((x) => <option key={x}>{x.replaceAll('_',' ')}</option>)}</select></label>
              <button className="btn btn-primary" disabled={busyItemId !== null}>Submit return</button>
            </form>
            <form className="panel" onSubmit={(e) => { e.preventDefault(); void mutate(null, () => api.createDispute({ orderId: caseForm.orderId, category: caseForm.category, description: caseForm.description }, crypto.randomUUID()), () => { disputesQuery.reload(); setCaseForm((f) => ({ ...f, description: '' })) }) }}>
              <h3>Open a dispute</h3><label>Order<select required value={caseForm.orderId} onChange={(e) => setCaseForm({ ...caseForm, orderId: e.target.value, orderLineId: '' })}><option value="">Select an order</option>{(ordersQuery.data ?? []).map((order) => <option key={order.id} value={order.id}>{order.number}</option>)}</select></label>
              <label>Category<select value={caseForm.category} onChange={(e) => setCaseForm({ ...caseForm, category: e.target.value })}>{['not_delivered','quality','counterfeit','wrong_item','refund_refused','other'].map((x) => <option key={x}>{x.replaceAll('_',' ')}</option>)}</select></label>
              <label>Details<textarea required value={caseForm.description} onChange={(e) => setCaseForm({ ...caseForm, description: e.target.value })}/></label><button className="btn btn-primary" disabled={busyItemId !== null}>Submit dispute</button>
            </form>
            <div className="panel"><h3>Your returns</h3><Async query={returnsQuery} emptyTitle="No return requests">{(items) => <div className="order-list">{items.map((x) => <div className="order-row static" key={x.id}><button className="text-link" onClick={() => setSelectedReturnId(x.id)}><b>{x.reasonCode.replaceAll('_', ' ')}</b><span>{x.status.replaceAll('_', ' ')}</span><small>{formatDate(x.createdAt, locale)}</small></button>{x.status === 'requested' && <button className="text-link" onClick={() => void mutate(x.id, () => api.cancelReturn(x.id), returnsQuery.reload)}>Cancel</button>}{x.status !== 'cancelled' && <label className="text-link">Add evidence<input hidden type="file" accept="image/jpeg,image/png,application/pdf" onChange={(e) => { const f=e.target.files?.[0]; if(f) void mutate(x.id, () => api.uploadReturnEvidence(x.id, f), () => { returnsQuery.reload(); returnDetailQuery.reload() }) }}/></label>}</div>)}</div>}</Async>{selectedReturnId && <Async query={returnDetailQuery} emptyTitle="Return not found">{(detail) => <div className="panel"><button className="text-link" onClick={() => setSelectedReturnId(null)}>Close details</button><h4>Return timeline</h4>{detail.timeline.map((event) => <p key={`${event.status}-${event.occurredAt}`}><b>{event.status.replaceAll('_', ' ')}</b> · {formatDate(event.occurredAt, locale)} {event.reason ? `— ${event.reason}` : ''}</p>)}<p>{detail.evidence.length} evidence file(s)</p></div>}</Async>}</div>
            <div className="panel"><h3>Your disputes</h3><Async query={disputesQuery} emptyTitle="No disputes">{(items) => <div className="order-list">{items.map((x) => <div className="order-row static" key={x.id}><button className="text-link" onClick={() => setSelectedDisputeId(x.id)}><b>{x.category.replaceAll('_', ' ')}</b><span>{x.status.replaceAll('_', ' ')}</span><small>{x.outcomeNote ?? formatDate(x.createdAt, locale)}</small></button>{x.status !== 'resolved' && x.status !== 'withdrawn' && <button className="text-link" onClick={() => void mutate(x.id, () => api.cancelDispute(x.id), disputesQuery.reload)}>Cancel</button>}{x.status !== 'resolved' && x.status !== 'withdrawn' && <label className="text-link">Add evidence<input hidden type="file" accept="image/jpeg,image/png,application/pdf" onChange={(e) => { const f=e.target.files?.[0]; if(f) void mutate(x.id, () => api.uploadDisputeEvidence(x.id, f), () => { disputesQuery.reload(); disputeDetailQuery.reload() }) }}/></label>}</div>)}</div>}</Async>{selectedDisputeId && <Async query={disputeDetailQuery} emptyTitle="Dispute not found">{(detail) => <div className="panel"><button className="text-link" onClick={() => setSelectedDisputeId(null)}>Close details</button><h4>Dispute timeline</h4>{detail.timeline.map((event) => <p key={`${event.status}-${event.occurredAt}`}><b>{event.status.replaceAll('_', ' ')}</b> · {formatDate(event.occurredAt, locale)} {event.reason ? `— ${event.reason}` : ''}</p>)}<p>{detail.evidence.length} evidence file(s)</p></div>}</Async>}</div>
          </div>}
          {acctTab === 'reviews' && <div className="two-col">
            <form className="panel" onSubmit={(e) => { e.preventDefault(); const dimensions = { effectiveness: Number(reviewForm.effectiveness), valueForMoney: Number(reviewForm.valueForMoney), packaging: Number(reviewForm.packaging), authenticity: Number(reviewForm.authenticity) }; void mutate(null, () => editingReviewId ? api.updateReview(editingReviewId, { rating: Number(reviewForm.rating), body: reviewForm.body, dimensions }) : api.createReview({ orderLineId: reviewForm.orderLineId, rating: Number(reviewForm.rating), body: reviewForm.body, dimensions }), () => { myReviewsQuery.reload(); setEditingReviewId(null); setReviewForm({ orderLineId: '', rating: '5', body: '', effectiveness: '5', valueForMoney: '5', packaging: '5', authenticity: '5' }) }) }}>
              <h3>{editingReviewId ? 'Edit review' : 'Review a purchase'}</h3><p>Reviews are verified from your delivered order line and published after moderation.</p>{!editingReviewId && <label>Order line ID<input required value={reviewForm.orderLineId} onChange={(e) => setReviewForm({ ...reviewForm, orderLineId: e.target.value })}/></label>}<label>Overall rating<select value={reviewForm.rating} onChange={(e) => setReviewForm({ ...reviewForm, rating: e.target.value })}>{[1,2,3,4,5].map((n) => <option key={n}>{n}</option>)}</select></label>{(['effectiveness','valueForMoney','packaging','authenticity'] as const).map((key) => <label key={key}>{key.replace(/([A-Z])/g, ' $1')}<select value={reviewForm[key]} onChange={(e) => setReviewForm({ ...reviewForm, [key]: e.target.value })}>{[1,2,3,4,5].map((n) => <option key={n}>{n}</option>)}</select></label>)}<label>Review<textarea maxLength={10000} value={reviewForm.body} onChange={(e) => setReviewForm({ ...reviewForm, body: e.target.value })}/></label><button className="btn btn-primary" disabled={busyItemId !== null}>{editingReviewId ? 'Save review' : 'Submit review'}</button>
            </form>
            <div className="panel"><h3>Review history</h3><Async query={myReviewsQuery} emptyTitle="No reviews yet">{(items) => <div className="order-list">{items.map((x) => <div className="order-row static" key={x.id}><b>{x.rating}/5 · {x.status?.replaceAll('_', ' ')}</b><small>{x.body}</small>{x.sellerReply && <small>Seller reply: {x.sellerReply}</small>}{x.status === 'pending_moderation' && <><button className="text-link" onClick={() => { const d=x.dimensions ?? {}; setEditingReviewId(x.id); setReviewForm({ orderLineId: '', rating: String(x.rating), body: x.body ?? '', effectiveness: String(d.effectiveness ?? x.rating), valueForMoney: String(d.valueForMoney ?? x.rating), packaging: String(d.packaging ?? x.rating), authenticity: String(d.authenticity ?? x.rating) }) }}>Edit</button><button className="text-link" onClick={() => void mutate(x.id, () => api.deleteReview(x.id), myReviewsQuery.reload)}>Delete</button><label className="text-link">Add photo<input hidden type="file" accept="image/jpeg,image/png" onChange={(e) => { const f=e.target.files?.[0]; if(f) void mutate(x.id, () => api.uploadReviewMedia(x.id, f), myReviewsQuery.reload) }}/></label></>}</div>)}</div>}</Async></div>
          </div>}
        </>}
      </section>}

      {page === 'checkout' && <section className="section">
        <PageHero kicker={t.settle} title={t.checkH} note={t.checkP}/>
        {!signedIn ? signInPanel : placedOrder ? <div className="panel success">
          <h3>{t.orders} {placedOrder.number} {t.packed}</h3>
          <p>{placedOrder.total}</p>
          <button className="btn btn-primary" onClick={() => { setTrackNumber(placedOrder.number); setPlacedOrder(null); go('track') }}>{t.trackVan}</button>
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
            <button className="btn btn-primary" type="submit" disabled={placing || cartCount === 0}>
              {placing ? t.signInBusy : `${t.placeOrder}${cart ? ` · ${cart.total.display}` : ''}`}
            </button>
          </form>
          <aside className="panel summary">
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
      onClose={closeCart} onQty={changeQty} onRemove={removeLine}
      onCheckout={() => go('checkout')} onShop={() => openShop()}/>}

    <SiteFooter t={t} onHome={() => go('home')} links={[
      [t.footShop, () => openShop()],
      [t.footSvc, () => go('services')],
      [t.footKnow, () => go('knowledge')],
      [t.footSup, () => go('support')],
      [t.footTrack, () => go('track')],
    ]}/>
    <button className={showTop ? 'to-top visible' : 'to-top'} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top" type="button">↑</button>
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

      setPassword('')
    } catch (cause) {

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
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? t.signInBusy : mode === 'signIn' ? t.signInCta : t.registerCta}
      </button>
    </form>
    <button className="text-link" type="button" onClick={() => { setMode(mode === 'signIn' ? 'register' : 'signIn'); setError(null) }}>
      {mode === 'signIn' ? t.newHere : t.haveAccount}
    </button>
  </div>
}
