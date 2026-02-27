'use client'

import { useState } from 'react'
import { MOCK_PRODUCTS } from '@/lib/mock-data'

interface CartEntry {
  productId: string
  name: string
  price: number
  quantity: number
}

export default function CheckoutPage() {
  const [cart, setCart] = useState<Record<string, CartEntry>>({})
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function addToCart(productId: string, name: string, price: number) {
    setError(null)
    setSuccess(null)
    setCart((prev) => ({
      ...prev,
      [productId]: {
        productId,
        name,
        price,
        quantity: (prev[productId]?.quantity ?? 0) + 1,
      },
    }))
  }

  function removeFromCart(productId: string) {
    setCart((prev) => {
      const current = prev[productId]
      if (!current) return prev
      if (current.quantity <= 1) {
        const { [productId]: _, ...rest } = prev
        return rest
      }
      return {
        ...prev,
        [productId]: { ...current, quantity: current.quantity - 1 },
      }
    })
  }

  const cartItems = Object.values(cart).filter((item) => item.quantity > 0)
  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )

  async function handleCheckout() {
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
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

      setSuccess(`Order placed successfully! Your order ID is ${data.orderId}`)
      setCart({})
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-text">
          Checkout
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Browse products and place your order
        </p>
      </div>

      {/* Success banner */}
      {success && (
        <div className="mb-6 rounded-[var(--radius-md)] border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-medium text-emerald-800">{success}</p>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-6 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Product grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {MOCK_PRODUCTS.map((product) => {
          const inCart = cart[product.id]?.quantity ?? 0

          return (
            <div
              key={product.id}
              className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm font-semibold text-text">
                  {product.name}
                </h3>
                <p className="font-mono text-sm font-semibold text-text whitespace-nowrap ml-2">
                  ${product.price.toFixed(2)}
                </p>
              </div>

              {/* Stock indicator */}
              <div className="mb-4">
                {product.stock > 0 ? (
                  <span className="text-xs font-medium text-emerald-600">
                    {product.stock} left
                  </span>
                ) : (
                  <span className="text-xs font-medium text-text-tertiary">
                    Limited
                  </span>
                )}
              </div>

              {/* Add/remove controls */}
              {inCart > 0 ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => removeFromCart(product.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-border text-text-secondary hover:bg-bg-subtle transition-colors text-sm font-medium"
                  >
                    &minus;
                  </button>
                  <span className="font-mono text-sm font-medium text-text w-6 text-center">
                    {inCart}
                  </span>
                  <button
                    onClick={() =>
                      addToCart(product.id, product.name, product.price)
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-border text-text-secondary hover:bg-bg-subtle transition-colors text-sm font-medium"
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  onClick={() =>
                    addToCart(product.id, product.name, product.price)
                  }
                  className="rounded-[var(--radius-sm)] border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-subtle hover:text-text transition-colors"
                >
                  Add to cart
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Cart summary */}
      {cartItems.length > 0 && (
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-sm">
          <h2 className="font-display text-base font-semibold text-text mb-4">
            Cart Summary
          </h2>
          <div className="divide-y divide-border-subtle">
            {cartItems.map((item) => (
              <div
                key={item.productId}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium text-text">{item.name}</p>
                  <p className="text-xs text-text-tertiary">
                    Qty: {item.quantity} &times; ${item.price.toFixed(2)}
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
              ${cartTotal.toFixed(2)}
            </p>
          </div>
          <button
            onClick={handleCheckout}
            disabled={isSubmitting}
            className="mt-5 w-full rounded-[var(--radius-md)] bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Processing...' : 'Place Order'}
          </button>
        </div>
      )}
    </div>
  )
}
