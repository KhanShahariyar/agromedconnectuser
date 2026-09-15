

export interface Money {
  amountMinor: number
  currency: string
  display: string
}

export interface ResponseMeta {
  locale: string
  localeFallback: boolean
  correlationId: string
}

export interface ListingSummary {
  id: string
  slug: string
  sku: string

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

  stockSignal: string

  primaryImageUrl?: string | null
}

export interface ListingDetail extends Omit<ListingSummary, 'price'> {
  shortDescription?: string | null
  description?: string | null
  sellerOrganisationId: string
  sellerName: string
  status: string
  pricing?: { buyerPrice?: Money | null; originalPrice?: Money | null; discountPercent?: number | null } | null
  stock?: { signal: string } | null
  product?: { unitCode: string; packSize: number; unitPrice?: Money | null; unitPriceBasis?: string | null; activeIngredientPrice?: Money | null; activeIngredientPriceBasis?: string | null } | null
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
  slug: string
  title: string
  summary: string
  category: string
  minutesRead: number
  publishedAt: string
}
export interface ArticleDetail extends Article { body: string }

export interface Faq {
  id: string
  code: string
  topic: string
  question: string
  answer: string
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

  quotedUnitPrice?: Money | null
  priceChanged: boolean
  stockSignal: string
}

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
  sellerReply?: string | null
  repliedAt?: string | null
  status?: string | null
  dimensions?: { effectiveness?: number; valueForMoney?: number; packaging?: number; authenticity?: number; punctuality?: number; expertise?: number; behaviour?: number; outcome?: number } | null
  media?: { id: string; contentType: string; byteSize: number; createdAt: string }[]
}

export interface CaseEvidence { id: string; contentType: string; byteSize: number; createdAt: string }
export interface CaseTimeline { status: string; reason?: string | null; occurredAt: string }
export interface ReturnRequest { id: string; orderId: string; orderLineId: string; quantity: number; reasonCode: string; reasonNote?: string | null; status: string; createdAt: string; decidedAt?: string | null }
export interface Dispute { id: string; orderId: string; category: string; description: string; disputedAmountMinor?: number | null; currencyCode?: string | null; status: string; outcome?: string | null; outcomeNote?: string | null; createdAt: string }
export interface ReturnDetail { request: ReturnRequest; timeline: CaseTimeline[]; evidence: CaseEvidence[] }
export interface DisputeDetail { dispute: Dispute; timeline: CaseTimeline[]; evidence: CaseEvidence[] }

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

  refreshToken?: string
  tokenType: string
  expiresAt: string
  user: User
  organisations: Membership[]
}
