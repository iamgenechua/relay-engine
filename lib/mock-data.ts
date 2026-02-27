import { Order, TimelineEvent } from './types'

export const MOCK_ORDERS: Order[] = [
  {
    id: 'ORD-001',
    customerName: 'Sarah Chen',
    customerEmail: 'sarah@example.com',
    status: 'pending',
    items: [
      { id: 'item-1', name: 'Wireless Headphones', quantity: 1, price: 79.99, inStock: true },
      { id: 'item-2', name: 'USB-C Cable', quantity: 2, price: 12.99, inStock: true },
    ],
    total: 105.97,
    createdAt: '2026-02-27T10:30:00Z',
    updatedAt: '2026-02-27T10:30:00Z',
  },
  {
    id: 'ORD-002',
    customerName: 'Marcus Johnson',
    customerEmail: 'marcus@example.com',
    status: 'processing',
    items: [
      { id: 'item-3', name: 'Mechanical Keyboard', quantity: 1, price: 149.99, inStock: true },
    ],
    total: 149.99,
    createdAt: '2026-02-26T14:15:00Z',
    updatedAt: '2026-02-27T08:00:00Z',
  },
  {
    id: 'ORD-003',
    customerName: 'Aisha Patel',
    customerEmail: 'aisha@example.com',
    status: 'shipped',
    items: [
      { id: 'item-4', name: 'Monitor Stand', quantity: 1, price: 45.00, inStock: true },
      { id: 'item-5', name: 'Desk Mat', quantity: 1, price: 29.99, inStock: false },
    ],
    total: 74.99,
    createdAt: '2026-02-25T09:00:00Z',
    updatedAt: '2026-02-27T11:00:00Z',
  },
  {
    id: 'ORD-004',
    customerName: 'James Wilson',
    customerEmail: 'james@example.com',
    status: 'pending',
    items: [
      { id: 'item-6', name: 'Webcam HD Pro', quantity: 1, price: 89.99, inStock: true },
      { id: 'item-7', name: 'Ring Light', quantity: 1, price: 34.99, inStock: true },
      { id: 'item-8', name: 'Microphone Arm', quantity: 1, price: 24.99, inStock: true },
    ],
    total: 149.97,
    createdAt: '2026-02-27T13:45:00Z',
    updatedAt: '2026-02-27T13:45:00Z',
  },
]

export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
}

export const MOCK_PRODUCTS = [
  { id: 'prod-1', name: 'Wireless Headphones', price: 79.99, stock: 5 },
  { id: 'prod-2', name: 'USB-C Cable', price: 12.99, stock: 50 },
  { id: 'prod-3', name: 'Mechanical Keyboard', price: 149.99, stock: 3 },
  { id: 'prod-4', name: 'Monitor Stand', price: 45.00, stock: 8 },
  { id: 'prod-5', name: 'Desk Mat', price: 29.99, stock: 0 },
  { id: 'prod-6', name: 'Webcam HD Pro', price: 89.99, stock: 2 },
]

export const MOCK_TIMELINE_EVENTS: TimelineEvent[] = [
  { id: 'evt-1', event: 'pageview', description: 'Viewed Orders list', timestamp: '0:00' },
  { id: 'evt-2', event: 'click', description: 'Opened Order ORD-001', timestamp: '0:03' },
  { id: 'evt-3', event: 'click', description: 'Clicked status dropdown', timestamp: '0:07' },
  { id: 'evt-4', event: 'click', description: 'Selected "Shipped"', timestamp: '0:09' },
  { id: 'evt-5', event: 'api_error', description: 'Status update failed: Invalid transition', timestamp: '0:10', isError: true },
]
