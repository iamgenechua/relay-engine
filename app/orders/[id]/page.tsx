'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { MOCK_ORDERS } from '@/lib/mock-data'
import { Order, OrderStatus } from '@/lib/types'

const ALL_STATUSES: OrderStatus[] = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  processing: 'bg-blue-50 text-blue-700 border-blue-200',
  shipped: 'bg-violet-50 text-violet-700 border-violet-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-neutral-100 text-neutral-500 border-neutral-200',
}

const STATUS_BUTTON_STYLES: Record<OrderStatus, string> = {
  pending:
    'border-amber-300 text-amber-700 hover:bg-amber-50',
  processing:
    'border-blue-300 text-blue-700 hover:bg-blue-50',
  shipped:
    'border-violet-300 text-violet-700 hover:bg-violet-50',
  delivered:
    'border-emerald-300 text-emerald-700 hover:bg-emerald-50',
  cancelled:
    'border-neutral-300 text-neutral-500 hover:bg-neutral-50',
}

export default function OrderDetailPage() {
  const params = useParams()
  const id = params.id as string

  const initialOrder = MOCK_ORDERS.find((o) => o.id === id)
  const [order, setOrder] = useState<Order | null>(initialOrder ?? null)
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    // Re-sync if navigating between orders
    const found = MOCK_ORDERS.find((o) => o.id === id)
    if (found) setOrder(found)
  }, [id])

  if (!order) {
    return (
      <div className="py-20 text-center">
        <h2 className="font-display text-xl font-semibold text-text">
          Order not found
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          No order with ID &ldquo;{id}&rdquo; exists.
        </p>
        <Link
          href="/orders"
          className="mt-4 inline-block text-sm font-medium text-accent hover:text-accent-dark transition-colors"
        >
          &larr; Back to orders
        </Link>
      </div>
    )
  }

  async function handleStatusChange(newStatus: OrderStatus) {
    setError(null)
    setIsUpdating(true)

    try {
      const res = await fetch(`/api/orders/${order!.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error)
        // Dispatch custom event for Relay Engine auto-trigger
        window.dispatchEvent(
          new CustomEvent('relay-engine:error', {
            detail: { message: data.error },
          })
        )
        return
      }

      setOrder(data.order)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  const availableStatuses = ALL_STATUSES.filter((s) => s !== order.status)

  return (
    <div>
      {/* Back link */}
      <Link
        href="/orders"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text transition-colors mb-6"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 19.5L8.25 12l7.5-7.5"
          />
        </svg>
        Back to orders
      </Link>

      {/* Order header */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-sm mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-text">
              Order{' '}
              <span className="font-mono text-accent">{order.id}</span>
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              {order.customerName} &middot;{' '}
              <span className="text-text-tertiary">
                {order.customerEmail}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-text-tertiary">
              Created{' '}
              {new Date(order.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium capitalize ${STATUS_STYLES[order.status]}`}
          >
            {order.status}
          </span>
        </div>
      </div>

      {/* Update status */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-sm mb-6">
        <h2 className="font-display text-base font-semibold text-text mb-4">
          Update Status
        </h2>

        {error && (
          <div className="mb-4 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {availableStatuses.map((status) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              disabled={isUpdating}
              className={`rounded-[var(--radius-md)] border px-4 py-2 text-sm font-medium capitalize transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${STATUS_BUTTON_STYLES[status]}`}
            >
              {isUpdating ? '...' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-sm">
        <h2 className="font-display text-base font-semibold text-text mb-4">
          Items
        </h2>
        <div className="divide-y divide-border-subtle">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
            >
              <div>
                <p className="text-sm font-medium text-text">{item.name}</p>
                <p className="text-xs text-text-tertiary">
                  Qty: {item.quantity}
                </p>
              </div>
              <p className="font-mono text-sm font-medium text-text">
                ${(item.price * item.quantity).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <p className="text-sm font-semibold text-text">Total</p>
          <p className="font-mono text-lg font-semibold text-text">
            ${order.total.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  )
}
