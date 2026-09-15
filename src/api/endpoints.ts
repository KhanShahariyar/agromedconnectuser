import { request } from './client'
import type {
  Address, Article, ArticleDetail, Cart, Category, Geography, ListingDetail, ListingSummary, Money, OrderSummary,
  Review, SearchResponse, ServiceSummary, Testimonial, User, ReturnRequest, Dispute, ReturnDetail, DisputeDetail,
  Faq,
} from './contracts'

export const getCategories = (signal?: AbortSignal) =>
  request<Category[]>('/api/v1/categories', { signal })

/**
 * One tier of the taxonomy, flat. No argument gives the three divisions;
 * parentId gives that node's children. This is what the progressive filter
 * uses, so it only ever fetches the tier the shopper has actually opened
 * rather than the whole tree up front.
 */
export const getCategoryTier = (
  params: { level?: number; parentId?: string } = {},
  signal?: AbortSignal,
) =>
  request<Category[]>('/api/v1/categories', {
    query: params.parentId
      ? { parent_id: params.parentId }
      : params.level != null
        ? { level: params.level }
        : {},
    signal,
  })

/** Division first, the category itself last. Feeds the breadcrumb above results. */
export const getCategoryBreadcrumb = (id: string, signal?: AbortSignal) =>
  request<Category[]>(`/api/v1/categories/${id}/breadcrumb`, { signal })

export interface SearchArgs {
  text?: string
  // The three tiers, applied progressively. divisionId and categoryId match the
  // whole subtree below them; subcategoryId is a leaf and matches exactly.
  // Each is optional -- sending only divisionId is "everything in Animal".
  divisionId?: string
  categoryId?: string
  subcategoryId?: string
  categoryCode?: string
  kind?: 'product' | 'service'
  brand?: string
  minPriceMinor?: number
  maxPriceMinor?: number

  minActiveIngredientPriceMinor?: number
  maxActiveIngredientPriceMinor?: number
  minRating?: number
  inStockOnly?: boolean
  onOfferOnly?: boolean

  sort?: string
  limit?: number

  cursor?: string
  includeFacets?: boolean
}

export const search = (args: SearchArgs = {}, signal?: AbortSignal) =>
  request<SearchResponse>('/api/v1/search', { method: 'POST', body: args, signal })

export const getListing = (id: string, signal?: AbortSignal) =>
  request<ListingDetail>(`/api/v1/listings/${id}`, { signal })

export const getListingBySlug = (slug: string, signal?: AbortSignal) =>
  request<ListingDetail>(`/api/v1/listings/slug/${slug}`, { signal })

export const getSuggestions = (listingId: string, signal?: AbortSignal) =>
  request<ListingSummary[]>(`/api/v1/listings/${listingId}/suggestions`, { signal })

export const getEquivalents = (listingId: string, signal?: AbortSignal) =>
  request<{ items: { listing: ListingSummary; unitPrice?: Money | null; unitPriceBasis?: string | null }[] }>(
    `/api/v1/listings/${listingId}/equivalents`, { signal })

export const compareListings = (listingIds: string[], signal?: AbortSignal) =>
  request<{ listings: ListingSummary[]; rows: { code: string; label: string; group: string; values: (string | null)[]; differs: boolean }[] }>(
    '/api/v1/compare', { method: 'POST', body: { listingIds }, signal })

export const suggest = (text: string, signal?: AbortSignal) =>
  request<string[]>('/api/v1/search/suggest', { query: { q: text }, signal })

export const getReviews = (listingId: string, signal?: AbortSignal) =>
  request<{ items: Review[]; nextCursor?: string | null }>(
    `/api/v1/listings/${listingId}/reviews`, { signal })
export const createReview = (body: { orderLineId: string; rating: number; body?: string; dimensions?: Review['dimensions'] }) => request<Review>('/api/v1/reviews', { method: 'POST', body })
export const updateReview = (id: string, body: { rating: number; body?: string; dimensions?: Review['dimensions'] }) => request<Review>(`/api/v1/reviews/${id}`, { method: 'PATCH', body })
export const deleteReview = (id: string) => request<void>(`/api/v1/reviews/${id}`, { method: 'DELETE' })
export const getMyReviews = (signal?: AbortSignal) => request<{ items: Review[]; nextCursor?: string | null }>('/api/v1/me/reviews', { signal })
export const uploadReviewMedia = (reviewId: string, file: File) => { const body = new FormData(); body.append('file', file); return request<{ id: string }>(`/api/v1/reviews/${reviewId}/media`, { method: 'POST', body }) }

export const getReturns = (signal?: AbortSignal) => request<{ items: ReturnRequest[] }>('/api/v1/returns', { signal })
export const getReturn = (id: string, signal?: AbortSignal) => request<ReturnDetail>(`/api/v1/returns/${id}`, { signal })
export const createReturn = (orderId: string, body: { orderLineId: string; quantity: number; reasonCode: string; reasonNote?: string }) => request<ReturnRequest>(`/api/v1/orders/${orderId}/returns`, { method: 'POST', body })
export const cancelReturn = (id: string) => request<ReturnRequest>(`/api/v1/returns/${id}/cancel`, { method: 'POST' })
export const uploadReturnEvidence = (id: string, file: File) => { const body = new FormData(); body.append('file', file); return request<{ id: string }>(`/api/v1/returns/${id}/evidence`, { method: 'POST', body }) }
export const getDisputes = (signal?: AbortSignal) => request<{ items: Dispute[] }>('/api/v1/disputes', { signal })
export const getDispute = (id: string, signal?: AbortSignal) => request<DisputeDetail>(`/api/v1/disputes/${id}`, { signal })
export const createDispute = (body: { orderId: string; category: string; description: string; disputedAmountMinor?: number }, key: string) => request<Dispute>('/api/v1/disputes', { method: 'POST', body, headers: { 'Idempotency-Key': key } })
export const cancelDispute = (id: string) => request<Dispute>(`/api/v1/disputes/${id}/cancel`, { method: 'POST' })
export const uploadDisputeEvidence = (id: string, file: File) => { const body = new FormData(); body.append('file', file); return request<{ id: string }>(`/api/v1/disputes/${id}/evidence`, { method: 'POST', body }) }

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

export const createBooking = (body: {
  serviceId: string
  preferredDate: string
  location: string
  contactPhone: string
  geographyId: string
  paymentMethod?: string
  notes?: string
}) => request<Booking>('/api/v1/bookings', { method: 'POST', body })

export const getArticles = (limit = 12, signal?: AbortSignal) =>
  request<Article[]>('/api/v1/content/articles', { query: { limit }, signal })
export const getArticle = (slug: string, signal?: AbortSignal) =>
  request<ArticleDetail>(`/api/v1/content/articles/${encodeURIComponent(slug)}`, { signal })

export const getTestimonials = (signal?: AbortSignal) =>
  request<Testimonial[]>('/api/v1/content/testimonials', { signal })

export const getFaqs = (topic?: string, signal?: AbortSignal) =>
  request<Faq[]>('/api/v1/content/faqs', { query: { audience: 'buyer', topic }, signal })

export const getGeographies = (signal?: AbortSignal) =>
  request<Geography[]>('/api/v1/reference/geographies', { signal })

export const getPaymentMethods = (signal?: AbortSignal) =>
  request<string[]>('/api/v1/reference/payment-methods', { signal })

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

export interface Quote {

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

export const validateCheckout = (body: { deliveryGeographyId?: string }) =>
  request<{ isValid: boolean; problems: { code: string; message: string }[] }>(
    '/api/v1/checkout/validate', { method: 'POST', body })

export const placeOrder = (body: {
  quoteToken: string
  paymentMethod: string
  deliveryAddress: string
  deliveryContactPhone: string
  deliveryGeographyId: string
  deliveryType?: string
  note?: string
}, idempotencyKey: string) => request<{ id: string; orderNumber: string; status: string; grandTotal: Money }>(
  '/api/v1/orders', { method: 'POST', body, headers: { 'Idempotency-Key': idempotencyKey } })

export const getOrders = (args: { status?: string; limit?: number; cursor?: string } = {}, signal?: AbortSignal) =>
  request<{ items: OrderSummary[]; nextCursor?: string | null; totalCount?: number; hasMore?: boolean }>(
    '/api/v1/orders', { query: args, signal })

export interface OrderCaseDetail { id: string; lines: { id: string; nameSnapshot: string; quantity: number; returnedQuantity: number }[] }
export const getOrder = (orderId: string, signal?: AbortSignal) =>
  request<OrderCaseDetail>(`/api/v1/orders/${orderId}`, { signal })

export const cancelOrder = (orderId: string, reason: string) =>
  request<void>(`/api/v1/orders/${orderId}/cancel`, { method: 'POST', body: { reason } })

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
