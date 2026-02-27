'use client'

import { useState } from 'react'
import { MOCK_PRODUCTS } from '@/lib/mock-data'

interface CartEntry {
  productId: string
  name: string
  price: number
  quantity: number
}

export default function CartPage() {
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
        window.dispatchEvent(
          new CustomEvent('relay-engine:error', {
            detail: { message: data.error },
          })
        )
        return
      }

      setSuccess(`Order placed. Your order ID is ${data.orderId}`)
      setCart({})
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-10">
        <h1 className="font-display text-3xl font-medium text-text">
          Shop
        </h1>
        <p className="mt-2 font-body text-sm text-text-tertiary">
          Browse our collection and add items to your cart
        </p>
      </div>

      {/* Success message */}
      {success && (
        <div className="mb-8 rounded-[var(--radius-md)] border border-border bg-accent-light px-5 py-4">
          <p className="font-body text-sm text-accent-dark">{success}</p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-8 rounded-[var(--radius-md)] border border-border bg-bg-subtle px-5 py-4">
          <p className="font-body text-sm text-text">{error}</p>
        </div>
      )}

      {/* Product grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-10">
        {MOCK_PRODUCTS.map((product) => {
          const inCart = cart[product.id]?.quantity ?? 0

          return (
            <div
              key={product.id}
              className="rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Product image placeholder */}
              <div className="mb-5 aspect-square rounded-[var(--radius-md)] bg-bg-subtle" />

              <div className="flex items-start justify-between mb-2">
                <h3 className="font-body text-sm font-medium text-text">
                  {product.name}
                </h3>
                <p className="font-mono text-sm text-text ml-3 whitespace-nowrap">
                  ${product.price.toFixed(2)}
                </p>
              </div>

              {/* Stock indicator */}
              <div className="mb-5">
                {product.stock > 0 ? (
                  <span className="font-body text-xs text-text-tertiary">
                    {product.stock <= 5 ? `Only ${product.stock} left` : 'In stock'}
                  </span>
                ) : (
                  <span className="font-body text-xs text-text-tertiary">
                    Out of stock
                  </span>
                )}
              </div>

              {/* Add/remove controls */}
              {inCart > 0 ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => removeFromCart(product.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border border-border font-body text-sm text-text-secondary transition-colors hover:bg-bg-subtle"
                  >
                    &minus;
                  </button>
                  <span className="font-mono text-sm text-text w-6 text-center">
                    {inCart}
                  </span>
                  <button
                    onClick={() =>
                      addToCart(product.id, product.name, product.price)
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border border-border font-body text-sm text-text-secondary transition-colors hover:bg-bg-subtle"
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  onClick={() =>
                    addToCart(product.id, product.name, product.price)
                  }
                  className="rounded-[var(--radius-sm)] border border-border px-4 py-2 font-body text-xs font-normal text-text-secondary transition-colors hover:border-accent hover:text-accent"
                  style={{ letterSpacing: '0.04em' }}
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
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-8 shadow-sm">
          <h2 className="font-display text-lg font-medium text-text mb-5">
            Your Cart
          </h2>
          <div className="divide-y divide-border-subtle">
            {cartItems.map((item) => (
              <div
                key={item.productId}
                className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-body text-sm text-text">{item.name}</p>
                  <p className="font-body text-xs text-text-tertiary">
                    Qty: {item.quantity} &times; ${item.price.toFixed(2)}
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
              ${cartTotal.toFixed(2)}
            </p>
          </div>
          <button
            onClick={handleCheckout}
            disabled={isSubmitting}
            className="mt-6 w-full rounded-[var(--radius-md)] bg-accent px-4 py-3 font-body text-sm font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ letterSpacing: '0.04em' }}
          >
            {isSubmitting ? 'Processing...' : 'Place Order'}
          </button>
        </div>
      )}
    </div>
  )
}
