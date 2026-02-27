export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

export interface OrderItem {
  id: string
  name: string
  quantity: number
  price: number
  inStock: boolean
}

export interface Order {
  id: string
  customerName: string
  customerEmail: string
  status: OrderStatus
  items: OrderItem[]
  total: number
  createdAt: string
  updatedAt: string
}

export interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
}

export interface Report {
  id: string
  type: 'bug' | 'edge_case' | 'ux_issue'
  title: string
  summary: string
  evidence: string
  userQuote: string
  elementContext: string
  conversationLog: { role: string; content: string }[]
  eventTimeline: TimelineEvent[]
  createdAt: string
}

export interface TimelineEvent {
  id: string
  event: string
  description: string
  timestamp: string
  isError?: boolean
  properties?: Record<string, unknown>
}
