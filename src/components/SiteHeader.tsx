import { useCallback, useRef, useState } from 'react'
import { Bell, ChevronDown, Heart, Menu, Search, ShoppingCart, UserRound, X } from 'lucide-react'
import type { Copy } from '../i18n'
import { BrandLogo } from './BrandLogo'
import type { CategoryView } from '../api/view'
import { useDismissable, useStickyHeight } from './hooks'

export interface NavItem {
  label: string
  current: boolean
  hot: boolean
  onSelect: () => void
}

/**
 * Utility bar + one sticky head (app bar and category nav) + mobile drawer.
 * The sticky block publishes its height as --head-h for everything that sticks
 * beneath it (the catalog filter bar, the category sidebar, toasts).
 */
export function SiteHeader({
  t, scrolled, langLabel, onToggleLang, onHelp, onTrack, onHome,
  navItems, categories, onPickCategory,
  searchDraft, onSearchDraft, onSearch,
  onNotifications, onWishlist, wishCount, onCart, cartCount, bump,
  accountName, onAccount,
}: {
  t: Copy
  scrolled: boolean
  langLabel: string
  onToggleLang: () => void
  onHelp: () => void
  onTrack: () => void
  onHome: () => void
  navItems: NavItem[]
  categories: CategoryView[]
  onPickCategory: (id: string) => void
  searchDraft: string
  onSearchDraft: (value: string) => void
  onSearch: () => void
  onNotifications: () => void
  onWishlist: () => void
  wishCount: number
  onCart: () => void
  cartCount: number
  bump: boolean
  accountName: string
  onAccount: () => void
}) {
  const headRef = useRef<HTMLDivElement>(null)
  useStickyHeight(headRef, '--head-h')

  const [browseOpen, setBrowseOpen] = useState(false)
  const browseRef = useRef<HTMLDivElement>(null)
  const closeBrowse = useCallback(() => setBrowseOpen(false), [])
  useDismissable(browseOpen, closeBrowse, browseRef, { modal: false })

  const [drawerOpen, setDrawerOpen] = useState(false)
  const drawerRef = useRef<HTMLElement>(null)
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])
  useDismissable(drawerOpen, closeDrawer, drawerRef)

  // Every navigation from the drawer also closes it.
  const viaDrawer = (fn: () => void) => () => { setDrawerOpen(false); setBrowseOpen(false); fn() }

  const categoryItems = (onPick: (id: string) => () => void) => categories.map((c) => (
    <button key={c.id} type="button" className="browse-item" onClick={onPick(c.id)}>
      <b>{c.index}</b><span>{c.name}</span><small>{c.childNames}</small>
    </button>
  ))

  return <>
    <div className="utility-bar on-dark">
      <div className="container">
        <span>BD · {t.top}</span>
        <nav aria-label={t.help}>
          <button type="button" onClick={onHelp}>{t.help}</button>
          <button type="button" onClick={onTrack}>{t.track}</button>
          <button type="button" className="lang" onClick={onToggleLang}>{langLabel}</button>
        </nav>
      </div>
    </div>

    <div ref={headRef} className={scrolled ? 'site-head is-scrolled' : 'site-head'}>
      <div className="container site-header">
        <button type="button" className="icon-btn menu-btn" onClick={() => setDrawerOpen(true)}
          aria-label={t.browse} aria-expanded={drawerOpen} aria-controls="mobile-nav">
          <Menu/>
        </button>

        <BrandLogo onClick={onHome}/>

        <form className="search" role="search" onSubmit={(e) => { e.preventDefault(); onSearch() }}>
          <Search size={18} aria-hidden/>
          <label htmlFor="site-search" className="sr-only">{t.search}</label>
          <input id="site-search" type="search" value={searchDraft} onChange={(e) => onSearchDraft(e.target.value)} placeholder={t.searchPh}/>
          <button type="submit" className="btn btn-primary">{t.search}</button>
        </form>

        <div className="head-actions">
          <button type="button" className="icon-btn bell" onClick={onNotifications} aria-label={t.notifH}><Bell/></button>
          <button type="button" className="icon-btn" onClick={onWishlist} aria-label={t.wishlist}>
            <Heart/>{wishCount > 0 && <em className="count">{wishCount}</em>}<span className="label" aria-hidden>{t.wishlist}</span>
          </button>
          <button type="button" className="icon-btn" onClick={onCart} aria-label={t.cart}>
            <ShoppingCart/>{cartCount > 0 && <em className={bump ? 'count bump' : 'count'}>{cartCount}</em>}<span className="label" aria-hidden>{t.cart}</span>
          </button>
          <button type="button" className="icon-btn" onClick={onAccount} aria-label={t.account}>
            <UserRound/>
            <span className="account-name" aria-hidden>{t.account}<small>{accountName}</small></span>
          </button>
        </div>
      </div>

      <nav className="primary-nav" aria-label="Primary">
        <div className="container">
          <div className="browse-wrap" ref={browseRef}>
            <button type="button" className="btn btn-primary browse-btn" onClick={() => setBrowseOpen(!browseOpen)}
              aria-expanded={browseOpen} aria-controls="browse-menu">
              {t.browse} <ChevronDown size={15} aria-hidden/>
            </button>
            {browseOpen && <div id="browse-menu" className="browse-menu">
              {categoryItems((id) => () => { setBrowseOpen(false); onPickCategory(id) })}
            </div>}
          </div>
          {navItems.map((item) => (
            <button key={item.label} type="button" className="nav-link" aria-current={item.current ? 'page' : undefined} onClick={item.onSelect}>
              {item.label}{item.hot && <b className="hot">{t.hot}</b>}
            </button>
          ))}
        </div>
      </nav>
    </div>

    {drawerOpen && <>
      <div className="backdrop" onClick={closeDrawer}/>
      <aside id="mobile-nav" ref={drawerRef} className="mobile-nav" role="dialog" aria-modal="true" aria-label={t.browse}>
        <div className="mobile-nav-head">
          <BrandLogo onClick={viaDrawer(onHome)}/>
          <button type="button" className="icon-btn" onClick={closeDrawer} aria-label={t.close}><X/></button>
        </div>
        {navItems.map((item) => (
          <button key={item.label} type="button" className="nav-link" aria-current={item.current ? 'page' : undefined} onClick={viaDrawer(item.onSelect)}>
            {item.label}{item.hot && <b className="hot">{t.hot}</b>}
          </button>
        ))}
        <button type="button" className="nav-link" onClick={viaDrawer(onNotifications)}>{t.notifH}</button>
        <button type="button" className="nav-link" onClick={viaDrawer(onWishlist)}>{t.wishlist}</button>
        {categories.length > 0 && <>
          <h2>{t.browse}</h2>
          {categoryItems((id) => viaDrawer(() => onPickCategory(id)))}
        </>}
        <div className="mobile-nav-extra">
          <button type="button" className="btn btn-ghost" onClick={viaDrawer(onHelp)}>{t.help}</button>
          <button type="button" className="btn btn-ghost" onClick={viaDrawer(onTrack)}>{t.track}</button>
          <button type="button" className="btn btn-outline" onClick={onToggleLang}>{langLabel}</button>
        </div>
      </aside>
    </>}
  </>
}
