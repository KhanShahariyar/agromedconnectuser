/**
 * TypeScript mirrors of the API's response shapes.
 *
 * Only what this site actually reads is modelled. Copying the whole OpenAPI document would give
 * a false sense of coverage: a type that is never constructed from a real response is a type
 * nobody has checked against the server.
 *
 * Every field is written exactly as the API sends it, camelCase and all, so a value can be traced
 * from a network tab straight into a component without a translation step in between.
 */

/**
 * Money, always. There is no `number` price anywhere in this codebase.
 *
 * `amountMinor` is an integer count of the currency's smallest unit — 54450 is ৳544.50 — which is
 * why arithmetic on it is safe where arithmetic on 544.5 is not. `display` is rendered by the
 * server because the localised form is not a formatting detail the client can guess: Bengali needs
 * Bengali digits (৳৫৪৪.৫০) and the 2,2,3 grouping that South Asian currencies use, and both depend
 * on the locale the server decided to serve, not the one the browser asked for.
 *
 * Read `display`. Compute with `amountMinor`. Never build a price string by hand.
 */
export interface Money {
  amountMinor: number
  currency: string
  display: string
}

/** What the server actually served, which may not be what was requested. */
export interface ResponseMeta {
  locale: string
  localeFallback: boolean
  correlationId: string
}

/** A product or service in a list. */
export interface ListingSummary {
  id: string
  slug: string
  sku: string
  /** `product` or `service`. */
  kind: string
  name: string
  brand?: string | null
  categoryId: string
  categoryName: string
  ratingAverage?: number | null
  ratingCount: number
  price: Money
  originalPrice?: Money | null
  discountPercent?: number | null
  hasOffer: boolean
  /** `in_stock` | `low_stock` | `out_of_stock` — a signal, deliberately not a number. */
  stockSignal: string
  /** Relative (`/api/v1/media/…`); pass through {@link mediaUrl} before use. */
  primaryImageUrl?: string | null
}

export interface ListingDetail extends Omit<ListingSummary, 'price'> {
  shortDescription?: string | null
  description?: string | null
  sellerOrganisationId: string
  sellerName: string
  status: string
  pricing?: { unitPrice: Money; originalPrice?: Money | null; discountPercent?: number | null } | null
  stock?: { signal: string; unitCode?: string | null; packSize?: number | null } | null
  media?: { id: string; url: string; kind?: string | null }[] | null
  attributes?: { code: string; label: string; value: string }[] | null
  usageInstructions?: { heading: string; body: string }[] | null
  certificates?: { id: string; kind: string; reference: string }[] | null
  price?: Money
}

export interface Category {
  id: string
  code: string
  name: string
  parentId?: string | null
  depth: number
  listingKind: string
  displayOrder: number
  children?: Category[] | null
}

export interface SearchResponse {
  items: ListingSummary[]
  nextCursor?: string | null
  facets?: { code: string; label: string; values: { value: string; label: string; count: number }[] }[] | null
  meta: ResponseMeta
}

export interface Article {
  id: string
  title: string
  summary: string
  category: string
  minutesRead: number
  publishedAt: string
}

export interface Testimonial {
  quote: string
  name: string
  role: string
  initials: string
}

export interface ServiceSummary {
  id: string
  slug: string
  name: string
  shortDescription?: string | null
  categoryId: string
  categoryName: string
  pricingBasis: string
  durationMinutes?: number | null
  leadTimeDays?: number | null
  requiresSiteVisit: boolean
  coverageGeographyId?: string | null
  price: Money
  ratingAverage?: number | null
  ratingCount: number
  imageUrl?: string | null
}

export interface Geography {
  id: string
  code: string
  name: string
  parentId?: string | null
  /** `country` | `division` | `district` | `upazila` | `union`. */
  level: string
}

export interface CartItem {
  id: string
  listingId: string
  slug: string
  name: string
  brand?: string | null
  kind: string
  imageUrl?: string | null
  quantity: number
  unitCode?: string | null
  unitPrice: Money
  lineTotal: Money
  /** Set when the price moved since the item went in the basket. */
  quotedUnitPrice?: Money | null
  priceChanged: boolean
  stockSignal: string
}

/**
 * The basket, grouped by seller.
 *
 * The grouping is not presentational. One basket can span several manufacturers, each of which
 * fulfils and is paid separately, so a flat item list would misrepresent what is about to happen.
 */
export interface Cart {
  id: string
  currency: string
  sellers: { sellerOrganisationId: string; sellerName: string; items: CartItem[]; subtotal: Money }[]
  subtotal: Money
  discountTotal: Money
  total: Money
  itemCount: number
  couponCode?: string | null
  isFullyDiscounted: boolean
}

export interface OrderSummary {
  id: string
  orderNumber: string
  status: string
  grandTotal: Money
  lineCount: number
  placedAt: string
  primaryItemName?: string | null
  primaryImageUrl?: string | null
}

export interface Address {
  id: string
  label: string
  fullName: string
  phone: string
  addressLine: string
  postcode?: string | null
  geographyId: string
  geographyName: string
  isDefault: boolean
}

export interface Review {
  id: string
  listingId: string
  rating: number
  body: string
  authorName: string
  isVerifiedPurchase: boolean
  helpfulCount: number
  createdAt: string
}

/** One organisation the signed-in user may act within. */
export interface Membership {
  organisationId: string
  name: string
  kind: string
  roleCode: string
  isReadOnly: boolean
  verificationStatus: string
}

export interface User {
  id: string
  fullName: string
  phoneE164?: string | null
  email?: string | null
  preferredLocale: string
  organisationId: string
  organisationName: string
  organisationKind: string
  roles: string[]
  permissions: string[]
  phoneVerified: boolean
  emailVerified: boolean
  avatarUrl?: string | null
}

export interface AuthResponse {
  accessToken: string
  /**
   * Present for the mobile app's benefit and deliberately ignored here — this site's copy lives in
   * an HttpOnly cookie that JavaScript cannot read, which is the entire point. See `session.ts`.
   */
  refreshToken?: string
  tokenType: string
  expiresAt: string
  user: User
  organisations: Membership[]
}
