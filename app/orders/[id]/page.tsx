'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Order, OrderStatus } from '@/lib/types'

const STATUS_CONFIG: Record<OrderStatus, { color: string; label: string }> = {
  pending: { color: 'var(--color-status-pending)', label: 'Pending' },
  processing: { color: 'var(--color-status-processing)', label: 'Processing' },
  shipped: { color: 'var(--color-status-shipped)', label: 'Shipped' },
  delivered: { color: 'var(--color-status-delivered)', label: 'Delivered' },
  cancelled: { color: 'var(--color-status-cancelled)', label: 'Cancelled' },
}

interface ActionConfig {
  label: string
  onClick: () => void
  variant: 'primary' | 'secondary' | 'danger'
}

export default function OrderDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Order not found')
        return res.json()
      })
      .then((data) => setOrder(data.order))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="py-20 text-center">
        <p className="font-body text-sm text-text-tertiary">Loading order...</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="py-20 text-center">
        <h2 className="font-display text-xl font-medium text-text">
          Order not found
        </h2>
        <p className="mt-2 font-body text-sm text-text-secondary">
          No order with ID &ldquo;{id}&rdquo; exists.
        </p>
        <Link
          href="/orders"
          className="mt-4 inline-block font-body text-sm text-accent transition-colors hover:text-accent-dark"
        >
          Back to orders
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

  const currentStatus = STATUS_CONFIG[order.status]

  function getActions(): ActionConfig[] {
    switch (order!.status) {
      case 'pending':
        return [
          {
            label: 'Request Shipping',
            onClick: () => handleStatusChange('shipped'),
            variant: 'primary',
          },
          {
            label: 'Cancel Order',
            onClick: () => handleStatusChange('cancelled'),
            variant: 'danger',
          },
        ]
      case 'processing':
        return [
          {
            label: 'Track Package',
            onClick: () => {},
            variant: 'primary',
          },
          {
            label: 'Cancel Order',
            onClick: () => handleStatusChange('cancelled'),
            variant: 'danger',
          },
        ]
      case 'shipped':
        return [
          {
            label: 'Track Package',
            onClick: () => {},
            variant: 'primary',
          },
        ]
      case 'delivered':
        return [
          {
            label: 'Return Items',
            onClick: () => {},
            variant: 'secondary',
          },
        ]
      default:
        return []
    }
  }

  const actions = getActions()

  const variantClasses: Record<string, string> = {
    primary:
      'bg-accent text-white hover:bg-accent-dark',
    secondary:
      'border border-border text-text-secondary hover:border-accent hover:text-accent',
    danger:
      'border border-border text-text-secondary hover:border-red-400 hover:text-red-600',
  }

  return (
    <div>
      {/* Back link */}
      <Link
        href="/orders"
        className="inline-flex items-center gap-1.5 font-body text-sm text-text-tertiary transition-colors hover:text-text mb-8"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
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
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-8 shadow-sm mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-medium text-text">
              Order{' '}
              <span className="font-mono text-lg text-accent">{order.id}</span>
            </h1>
            <p className="mt-1 font-body text-xs text-text-tertiary">
              Placed{' '}
              {new Date(order.createdAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="block h-2 w-2 rounded-full"
              style={{ backgroundColor: currentStatus.color }}
            />
            <span
              className="font-body text-sm font-medium"
              style={{ color: currentStatus.color }}
            >
              {currentStatus.label}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      {actions.length > 0 && (
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-8 shadow-sm mb-6">
          <h2 className="font-display text-lg font-medium text-text mb-5">
            Actions
          </h2>

          {error && (
            <div className="mb-5 rounded-[var(--radius-md)] border border-border bg-bg-subtle px-5 py-4">
              <p className="font-body text-sm text-text">{error}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {actions.map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                disabled={isUpdating}
                className={`rounded-[var(--radius-md)] px-5 py-2.5 font-body text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${variantClasses[action.variant]}`}
              >
                {isUpdating ? '...' : action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-8 shadow-sm">
        <h2 className="font-display text-lg font-medium text-text mb-5">
          Items
        </h2>
        <div className="divide-y divide-border-subtle">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
            >
              <div>
                <p className="font-body text-sm text-text">{item.name}</p>
                <p className="font-body text-xs text-text-tertiary">
                  Qty: {item.quantity}
                </p>
              </div>
              <p className="font-mono text-sm font-medium text-text">
                ${(item.price * item.quantity).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-border pt-5">
          <p className="font-body text-sm font-medium text-text">Total</p>
          <p className="font-mono text-lg font-medium text-text">
            ${order.total.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  )
}
