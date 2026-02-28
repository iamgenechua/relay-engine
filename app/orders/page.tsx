'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Order, OrderStatus } from '@/lib/types'

const STATUS_CONFIG: Record<OrderStatus, { color: string; label: string }> = {
  pending: { color: 'var(--color-status-pending)', label: 'Pending' },
  processing: { color: 'var(--color-status-processing)', label: 'Processing' },
  shipped: { color: 'var(--color-status-shipped)', label: 'Shipped' },
  delivered: { color: 'var(--color-status-delivered)', label: 'Delivered' },
  cancelled: { color: 'var(--color-status-cancelled)', label: 'Cancelled' },
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/orders')
      .then((res) => res.json())
      .then((data) => setOrders(data.orders))
      .catch((err) => console.error('Failed to load orders:', err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="py-20 text-center">
        <p className="font-body text-sm text-text-tertiary">Loading orders...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-10">
        <h1 className="font-display text-3xl font-medium text-text">
          My Orders
        </h1>
        <p className="mt-2 font-body text-sm text-text-tertiary">
          Track and manage your recent purchases
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {orders.map((order) => {
          const status = STATUS_CONFIG[order.status]
          const date = new Date(order.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })

          return (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="group rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-sm transition-all hover:shadow-md hover:border-accent/30"
            >
              <div className="flex items-start justify-between mb-4">
                <span className="font-mono text-sm font-medium text-accent group-hover:text-accent-dark transition-colors">
                  {order.id}
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className="block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  <span
                    className="font-body text-xs font-medium"
                    style={{ color: status.color }}
                  >
                    {status.label}
                  </span>
                </div>
              </div>

              <p className="font-body text-xs text-text-tertiary mb-4">
                {date}
              </p>

              <div className="flex items-center justify-between">
                <span className="font-body text-sm text-text-secondary">
                  {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                </span>
                <span className="font-mono text-sm font-medium text-text">
                  ${order.total.toFixed(2)}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
