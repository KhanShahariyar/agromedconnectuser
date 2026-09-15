import { mediaUrl } from './client'
import type { Article, Category, ListingDetail, ListingSummary, Money, OrderSummary, ServiceSummary } from './contracts'

export interface ProductView {
  id: string
  slug: string
  name: string
  brand: string
  categoryId: string
  categoryName: string

  price: string

  priceMinor: number
  originalPrice?: string
  discountPercent?: number
  hasOffer: boolean
  rating: number
  reviews: number

  stockSignal: string
  image?: string
  kind: string
  sku: string
}

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

    image: mediaUrl(listing.primaryImageUrl, true),
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
  normalizedUnitPrice?: string
  activeIngredientPrice?: string
}

export function toProductDetail(listing: ListingDetail): ProductDetailView {
  const price: Money = listing.pricing?.buyerPrice ?? listing.price ?? { amountMinor: 0, currency: 'BDT', display: '—' }
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

    image: media[0],
    images: media,
    kind: listing.kind,
    sku: listing.sku,
    description: listing.description ?? listing.shortDescription ?? '',
    sellerName: listing.sellerName,
    unit: listing.product?.unitCode ?? '',
    normalizedUnitPrice: listing.product?.unitPrice && listing.product.unitPriceBasis
      ? `${listing.product.unitPrice.display} ${listing.product.unitPriceBasis}` : undefined,
    activeIngredientPrice: listing.product?.activeIngredientPrice && listing.product.activeIngredientPriceBasis
      ? `${listing.product.activeIngredientPrice.display} ${listing.product.activeIngredientPriceBasis}` : undefined,
    attributes: (listing.attributes ?? []).map((a) => ({ label: a.label, value: a.value })),
    usage: listing.usageInstructions ?? [],
  }
}

export interface CategoryView {
  id: string
  code: string
  name: string

  index: string
  childNames: string
}

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
    image: mediaUrl(s.imageUrl, true),
  }))
}

export interface ArticleView {
  id: string
  slug: string
  title: string
  summary: string
  kicker: string
  read: string
  publishedAt: string
}

export function toArticles(articles: Article[], readSuffix: string): ArticleView[] {
  return articles.map((a) => ({
    id: a.id,
    slug: a.slug,
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
    image: mediaUrl(o.primaryImageUrl, true),
  }))
}

export function formatDate(iso: string, locale: string) {
  const time = Date.parse(iso)
  if (Number.isNaN(time)) return iso
  return new Date(time).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })
}
