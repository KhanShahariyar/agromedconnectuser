export type Page =
  | 'home' | 'shop' | 'product' | 'brands' | 'services' | 'offers'
  | 'knowledge' | 'article' | 'support' | 'track' | 'account'
  | 'wishlist' | 'checkout' | 'notifications' | 'help'
  | 'compare'

export const topicKeys = ['Delivery', 'Product quality', 'Payment', 'Service booking'] as const

export const payKeys = ['bkash', 'nagad', 'card', 'cash_on_delivery'] as const
