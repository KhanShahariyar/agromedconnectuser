import { mediaUrl } from './client'
import type { Article, Category, ListingDetail, ListingSummary, Money, OrderSummary, ServiceSummary } from './contracts'

/**
 * View models: the shapes the components render.
 *
 * ## Why there is no `nameBn` any more
 *
 * The mock data carried both languages in every record and the UI picked one with `bn ? x.nameBn :
 * x.name`. Live data cannot work that way. Listing names, category names and price strings are
 * rendered server-side from the `i18n.translation` table against the locale negotiated for that
 * request, so a response holds *one* language — the one that was asked for.
 *
 * Switching language is therefore a refetch, not a re-render. Every query key includes the locale,
 * so flipping it invalidates and re-runs the queries, and the API returns the same rows written the
 * other way. This is more work than a client-side lookup and it is the only correct arrangement:
 * translations live in one place, are edited without shipping the front end, and never drift.
 */

export interface ProductView {
  id: string
  slug: string
  name: string
  brand: string
  categoryId: string
  categoryName: string
  /** Server-rendered and localised — `৳৫৪৪.৫০` or `৳544.50`. Render this, never a hand-built one. */
  price: string
  /** Integer minor units, for arithmetic only. */
  priceMinor: number
  originalPrice?: string
  discountPercent?: number
  hasOffer: boolean
  rating: number
  reviews: number
  /** `in_stock` | `low_stock` | `out_of_stock`. */
  stockSignal: string
  image?: string
  kind: string
  sku: string
}

/**
 * Stock is a signal, not a count.
 *
 * The API deliberately does not tell a buyer how many units are on the shelf: it is a competitor's
 * question as much as a customer's, and an exact figure goes stale between the render and the
 * click. Three buckets is what a buying decision actually needs.
 */
export function stockLabel(signal: string, copy: { inStock: string; lowStock: string; outOfStock: string }) {
  if (signal === 'out_of_stock') return copy.outOfStock
  if (signal === 'low_stock') return copy.lowStock
  return copy.inStock
}

export function toProduct(listing: ListingSummary): ProductView {
  return {
    id: listing.id,
    slug: listing.slug,
    name: listing.name,
    brand: listing.brand ?? '',
    categoryId: listing.categoryId,
    categoryName: listing.categoryName,
    price: listing.price.display,
    priceMinor: listing.price.amountMinor,
    originalPrice: listing.originalPrice?.display,
    discountPercent: listing.discountPercent ?? undefined,
    hasOffer: listing.hasOffer,
    rating: listing.ratingAverage ?? 0,
    reviews: listing.ratingCount,
    stockSignal: listing.stockSignal,
    image: mediaUrl(listing.primaryImageUrl),
    kind: listing.kind,
    sku: listing.sku,
  }
}

export interface ProductDetailView extends ProductView {
  description: string
  sellerName: string
  unit: string
  images: string[]
  attributes: { label: string; value: string }[]
  usage: { heading: string; body: string }[]
}

export function toProductDetail(listing: ListingDetail): ProductDetailView {
  const price: Money = listing.pricing?.unitPrice ?? listing.price ?? { amountMinor: 0, currency: 'BDT', display: '—' }
  const media = (listing.media ?? []).map((m) => mediaUrl(m.url)).filter((u): u is string => !!u)
  return {
    id: listing.id,
    slug: listing.slug,
    name: listing.name,
    brand: listing.brand ?? '',
    categoryId: listing.categoryId,
    categoryName: listing.categoryName,
    price: price.display,
    priceMinor: price.amountMinor,
    originalPrice: listing.pricing?.originalPrice?.display,
    discountPercent: listing.pricing?.discountPercent ?? undefined,
    hasOffer: !!listing.pricing?.originalPrice,
    rating: listing.ratingAverage ?? 0,
    reviews: listing.ratingCount,
    stockSignal: listing.stock?.signal ?? 'in_stock',
    // The detail response has no `primaryImageUrl`; the first media row is the primary one.
    image: media[0],
    images: media,
    kind: listing.kind,
    sku: listing.sku,
    description: listing.description ?? listing.shortDescription ?? '',
    sellerName: listing.sellerName,
    unit: listing.stock?.unitCode ?? '',
    attributes: (listing.attributes ?? []).map((a) => ({ label: a.label, value: a.value })),
    usage: listing.usageInstructions ?? [],
  }
}

export interface CategoryView {
  id: string
  code: string
  name: string
  /** Two digits, matching the numbered tiles the design already uses. */
  index: string
  childNames: string
}

/**
 * Flattens the category tree to its top level.
 *
 * The navigation shows roots only. Children still matter — a search filtered by a root category
 * must include everything beneath it, which the API handles server-side — but listing every leaf in
 * a six-tile grid would bury the choice the user is actually making. The children are folded into a
 * subtitle so the tile still says what is inside it.
 */
export function toCategories(tree: Category[]): CategoryView[] {
  return tree
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((c, i) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      index: String(i + 1).padStart(2, '0'),
      childNames: (c.children ?? []).map((child) => child.name).join(' · '),
    }))
}

export interface ServiceView {
  id: string
  name: string
  note: string
  price: string
  categoryName: string
  index: string
  leadTimeDays?: number
  requiresSiteVisit: boolean
  image?: string
}

export function toServices(services: ServiceSummary[]): ServiceView[] {
  return services.map((s, i) => ({
    id: s.id,
    name: s.name,
    note: s.shortDescription ?? s.categoryName,
    price: s.price.display,
    categoryName: s.categoryName,
    index: String(i + 1).padStart(2, '0'),
    leadTimeDays: s.leadTimeDays ?? undefined,
    requiresSiteVisit: s.requiresSiteVisit,
    image: mediaUrl(s.imageUrl),
  }))
}

export interface ArticleView {
  id: string
  title: string
  summary: string
  kicker: string
  read: string
  publishedAt: string
}

export function toArticles(articles: Article[], readSuffix: string): ArticleView[] {
  return articles.map((a) => ({
    id: a.id,
    title: a.title,
    summary: a.summary,
    kicker: a.category,
    read: `${a.minutesRead} ${readSuffix}`,
    publishedAt: a.publishedAt,
  }))
}

export interface BrandView {
  name: string
  listings: number
  fields: string
}

/**
 * Derives the brand list from listings rather than a brand endpoint.
 *
 * There is no brand table in the API: a brand is a column on a listing, not an entity with a
 * profile, so "which brands exist" is only answerable by looking at what is currently for sale —
 * which is also the honest answer, since a brand with nothing listed is not one a buyer can shop.
 *
 * The counts are exact for the page they were computed from. At catalogue sizes where that stops
 * being true this should move to a search facet, which the endpoint already supports; the facet
 * array simply comes back empty against the current data.
 */
export function toBrands(listings: ListingSummary[]): BrandView[] {
  const byName = new Map<string, { count: number; categories: Set<string> }>()
  for (const listing of listings) {
    if (!listing.brand) continue
    const entry = byName.get(listing.brand) ?? { count: 0, categories: new Set<string>() }
    entry.count += 1
    entry.categories.add(listing.categoryName)
    byName.set(listing.brand, entry)
  }
  return [...byName.entries()]
    .map(([name, entry]) => ({
      name,
      listings: entry.count,
      fields: [...entry.categories].join(' · '),
    }))
    .sort((a, b) => b.listings - a.listings)
}

export interface OrderView {
  id: string
  number: string
  status: string
  total: string
  lineCount: number
  placedAt: string
  itemName: string
  image?: string
}

export function toOrders(orders: OrderSummary[]): OrderView[] {
  return orders.map((o) => ({
    id: o.id,
    number: o.orderNumber,
    status: o.status,
    total: o.grandTotal.display,
    lineCount: o.lineCount,
    placedAt: o.placedAt,
    itemName: o.primaryItemName ?? '',
    image: mediaUrl(o.primaryImageUrl),
  }))
}

/**
 * Formats a timestamp in the active locale.
 *
 * `bn-BD` gives Bengali digits and month names, which is the whole reason this does not simply
 * slice the ISO string. Falls back to the raw value rather than throwing if the date is unparseable
 * — a malformed date should cost a tidy label, not a blank screen.
 */
export function formatDate(iso: string, locale: string) {
  const time = Date.parse(iso)
  if (Number.isNaN(time)) return iso
  return new Date(time).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })
}
