import { request } from './client'
import type {
  Address, Article, Cart, Category, Geography, ListingDetail, ListingSummary, Money, OrderSummary,
  Review, SearchResponse, ServiceSummary, Testimonial, User,
} from './contracts'

/**
 * Every call this site makes, in one place.
 *
 * Components import from here rather than calling `request` directly, so a change to a path or a
 * query parameter is a one-line edit instead of a search across the UI, and so the argument names
 * are meaningful (`inStockOnly`) rather than positional strings.
 */

// ------------------------------------------------------------------ catalogue

/**
 * The category tree.
 *
 * Returns roots with `children` nested, not a flat list — the shape the navigation actually needs.
 * Public: browsing does not require an account.
 */
export const getCategories = (signal?: AbortSignal) =>
  request<Category[]>('/api/v1/categories', { signal })

export interface SearchArgs {
  text?: string
  categoryId?: string
  categoryCode?: string
  kind?: 'product' | 'service'
  brand?: string
  minPriceMinor?: number
  maxPriceMinor?: number
  minRating?: number
  inStockOnly?: boolean
  onOfferOnly?: boolean
  /** `relevance` | `price_asc` | `price_desc` | `rating` | `newest`. */
  sort?: string
  limit?: number
  /** Opaque; pass back the `nextCursor` of the previous page. Never construct one. */
  cursor?: string
  includeFacets?: boolean
}

/**
 * Search and browse, which are the same endpoint.
 *
 * A blank `text` is a browse of everything, so the shop grid and the search results page are one
 * code path with one set of filters — there is no second listing endpoint to drift out of sync.
 *
 * Paging is by cursor, not page number. The cursor encodes a position in a sorted index, so it
 * returns the next rows in constant time and cannot skip or repeat an item when the catalogue
 * changes mid-scroll, which an `OFFSET` can and does.
 */
export const search = (args: SearchArgs = {}, signal?: AbortSignal) =>
  request<SearchResponse>('/api/v1/search', { method: 'POST', body: args, signal })

export const getListing = (id: string, signal?: AbortSignal) =>
  request<ListingDetail>(`/api/v1/listings/${id}`, { signal })

export const getListingBySlug = (slug: string, signal?: AbortSignal) =>
  request<ListingDetail>(`/api/v1/listings/slug/${slug}`, { signal })

/** "You might also like" — computed server-side from category, price band and co-purchase. */
export const getSuggestions = (listingId: string, signal?: AbortSignal) =>
  request<ListingSummary[]>(`/api/v1/listings/${listingId}/suggestions`, { signal })

/** Type-ahead. Cheap by design; it is called on nearly every keystroke. */
export const suggest = (text: string, signal?: AbortSignal) =>
  request<string[]>('/api/v1/search/suggest', { query: { q: text }, signal })

export const getReviews = (listingId: string, signal?: AbortSignal) =>
  request<{ items: Review[]; nextCursor?: string | null }>(
    `/api/v1/listings/${listingId}/reviews`, { signal })

// ------------------------------------------------------------------- services

/** Every bookable service. The endpoint takes no filters, so filtering is the caller's job. */
export const getServices = (signal?: AbortSignal) =>
  request<ServiceSummary[]>('/api/v1/services', { signal })

export const getService = (serviceId: string, signal?: AbortSignal) =>
  request<ServiceSummary>(`/api/v1/services/${serviceId}`, { signal })

export interface Booking {
  id: string
  orderNumber: string
  serviceId: string
  serviceName: string
  status: string
  scheduledDate?: string | null
  slotLabel?: string | null
  location?: string | null
  technicianName?: string | null
  total: { amountMinor: number; currency: string; display: string }
  placedAt: string
}

export const getBookings = (signal?: AbortSignal) =>
  request<{ items: Booking[] } | Booking[]>('/api/v1/bookings', { signal })

/**
 * Books a service visit.
 *
 * A booking is an order behind the scenes — it gets an order number, a payment method and a
 * delivery geography — which is why the request looks more like a checkout than a calendar entry.
 */
export const createBooking = (body: {
  serviceId: string
  preferredDate: string
  location: string
  contactPhone: string
  geographyId: string
  paymentMethod?: string
  notes?: string
}) => request<Booking>('/api/v1/bookings', { method: 'POST', body })

// -------------------------------------------------------------------- content

export const getArticles = (limit = 12, signal?: AbortSignal) =>
  request<Article[]>('/api/v1/content/articles', { query: { limit }, signal })

export const getTestimonials = (signal?: AbortSignal) =>
  request<Testimonial[]>('/api/v1/content/testimonials', { signal })

// ------------------------------------------------------------------ reference

/**
 * Bangladesh's administrative hierarchy, flat, each row pointing at its parent.
 *
 * Flat rather than nested because callers filter it by `level` far more often than they walk it,
 * and a delivery address needs one district out of sixty-four rather than the whole tree.
 */
export const getGeographies = (signal?: AbortSignal) =>
  request<Geography[]>('/api/v1/reference/geographies', { signal })

/**
 * The payment method codes the API accepts, e.g. `bkash`, `cash_on_delivery`.
 *
 * Codes, not labels — the endpoint returns bare strings and the display name is the client's
 * problem. Fetching them rather than hard-coding a list means a method the platform disables stops
 * being offered without a front-end release.
 */
export const getPaymentMethods = (signal?: AbortSignal) =>
  request<string[]>('/api/v1/reference/payment-methods', { signal })

// ----------------------------------------------------------------------- cart

export const getCart = (signal?: AbortSignal) => request<Cart>('/api/v1/cart', { signal })

export const addToCart = (listingId: string, quantity: number) =>
  request<Cart>('/api/v1/cart/items', { method: 'POST', body: { listingId, quantity } })

export const updateCartItem = (itemId: string, quantity: number) =>
  request<Cart>(`/api/v1/cart/items/${itemId}`, { method: 'PATCH', body: { quantity } })

export const removeCartItem = (itemId: string) =>
  request<Cart>(`/api/v1/cart/items/${itemId}`, { method: 'DELETE' })

export const clearCart = () => request<Cart>('/api/v1/cart', { method: 'DELETE' })

export const applyVoucher = (code: string) =>
  request<Cart>('/api/v1/cart/vouchers', { method: 'POST', body: { code } })

export const removeVoucher = () => request<Cart>('/api/v1/cart/vouchers', { method: 'DELETE' })

// ------------------------------------------------------------------- checkout

export interface Quote {
  /**
   * A signed statement of what the order costs, with a short life.
   *
   * Placing an order requires one, so the price the buyer agreed to is the price the server
   * charges — the client cannot post a total of its own choosing, and a price that moved between
   * quoting and placing is caught rather than silently applied.
   */
  quoteToken: string
  expiresAt: string
  subtotal: { amountMinor: number; currency: string; display: string }
  discountTotal: { amountMinor: number; currency: string; display: string }
  deliveryCharge: { amountMinor: number; currency: string; display: string }
  grandTotal: { amountMinor: number; currency: string; display: string }
}

export const quoteCheckout = (body: {
  deliveryGeographyId: string
  deliveryType?: string
  paymentMethod?: string
}) => request<Quote>('/api/v1/checkout/quote', { method: 'POST', body })

/** Pre-flight: stock, licences and delivery coverage, before the buyer types an address. */
export const validateCheckout = (body: { deliveryGeographyId?: string }) =>
  request<{ isValid: boolean; problems: { code: string; message: string }[] }>(
    '/api/v1/checkout/validate', { method: 'POST', body })

// --------------------------------------------------------------------- orders

/**
 * Places the order the quote describes.
 *
 * `quoteToken` is not optional and not decorative: it is the server's signed statement of what this
 * order costs, so the total is decided by the API and merely echoed by the client. An order posted
 * without one, or with a stale one, is refused rather than repriced silently.
 *
 * The `Idempotency-Key` header the API documents is not sent here yet — a retried POST would place
 * a second order. TODO: REVIEW — generate a key per checkout attempt and send it.
 */
export const placeOrder = (body: {
  quoteToken: string
  paymentMethod: string
  deliveryAddress: string
  deliveryContactPhone: string
  deliveryGeographyId: string
  deliveryType?: string
  note?: string
}) => request<{ id: string; orderNumber: string; status: string; grandTotal: Money }>(
  '/api/v1/orders', { method: 'POST', body })

export const getOrders = (args: { status?: string; limit?: number; cursor?: string } = {}, signal?: AbortSignal) =>
  request<{ items: OrderSummary[]; nextCursor?: string | null; totalCount?: number; hasMore?: boolean }>(
    '/api/v1/orders', { query: args, signal })

export const getOrder = (orderId: string, signal?: AbortSignal) =>
  request<Record<string, unknown>>(`/api/v1/orders/${orderId}`, { signal })

export const cancelOrder = (orderId: string, reason: string) =>
  request<void>(`/api/v1/orders/${orderId}/cancel`, { method: 'POST', body: { reason } })

// -------------------------------------------------------------------- profile

export const getMe = (signal?: AbortSignal) => request<User>('/api/v1/me', { signal })

export const getAddresses = (signal?: AbortSignal) =>
  request<Address[]>('/api/v1/me/addresses', { signal })

export const saveAddress = (body: Omit<Address, 'id' | 'geographyName'>) =>
  request<Address>('/api/v1/me/addresses', { method: 'POST', body })

export const getWishlist = (signal?: AbortSignal) =>
  request<{ items: ListingSummary[] }>('/api/v1/me/wishlist', { signal })

export const addToWishlist = (listingId: string) =>
  request<void>(`/api/v1/me/wishlist/${listingId}`, { method: 'POST' })

export const removeFromWishlist = (listingId: string) =>
  request<void>(`/api/v1/me/wishlist/${listingId}`, { method: 'DELETE' })
