'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '@/lib/cart-context'

export function CartDrawer() {
  const { items, isDrawerOpen, closeDrawer, removeFromCart, updateQuantity, clearCart, totalPrice } = useCart()
  const cartItems = Object.values(items).filter((i) => i.quantity > 0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeDrawer()
    }
    if (isDrawerOpen) {
      document.addEventListener('keydown', onKeyDown)
      return () => document.removeEventListener('keydown', onKeyDown)
    }
  }, [isDrawerOpen, closeDrawer])

  async function handleCheckout() {
    setIsSubmitting(true)
    setSuccess(null)

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
        window.dispatchEvent(
          new CustomEvent('relay-engine:error', {
            detail: { message: data.error },
          })
        )
        return
      }

      setSuccess(`Order placed! Your order ID is ${data.orderId}`)
      clearCart()
    } catch {
      window.dispatchEvent(
        new CustomEvent('relay-engine:error', {
          detail: { message: 'Network error. Please try again.' },
        })
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[100] bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDrawer}
          />

          {/* Panel */}
          <motion.div
            className="fixed right-0 top-0 z-[101] flex h-full w-full max-w-md flex-col bg-surface shadow-lg"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <h2 className="font-display text-xl font-medium text-text">Your Cart</h2>
              <button
                onClick={closeDrawer}
                className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-text-tertiary transition-colors hover:bg-bg-subtle hover:text-text"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable items */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {success && (
                <div className="mb-5 rounded-[var(--radius-md)] border border-border bg-accent-light px-4 py-3">
                  <p className="font-body text-sm text-accent-dark">{success}</p>
                </div>
              )}

              {cartItems.length === 0 && !success ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="font-body text-sm text-text-tertiary">Your cart is empty</p>
                </div>
              ) : (
                <div className="divide-y divide-border-subtle">
                  {cartItems.map((item) => (
                    <div key={item.productId} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                      {/* Item image placeholder */}
                      <div className="h-16 w-16 flex-shrink-0 rounded-[var(--radius-md)] bg-bg-subtle" />

                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm font-medium text-text truncate">{item.name}</p>
                        <p className="font-mono text-sm text-text-secondary">${item.price.toFixed(2)}</p>

                        {/* Quantity controls */}
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => removeFromCart(item.productId)}
                            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border border-border text-xs text-text-secondary transition-colors hover:bg-bg-subtle"
                          >
                            &minus;
                          </button>
                          <span className="font-mono text-sm text-text w-5 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border border-border text-xs text-text-secondary transition-colors hover:bg-bg-subtle"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <p className="font-mono text-sm font-medium text-text whitespace-nowrap">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sticky footer */}
            {cartItems.length > 0 && (
              <div className="border-t border-border px-6 py-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-body text-sm font-medium text-text">Total</p>
                  <p className="font-mono text-lg font-medium text-text">${totalPrice.toFixed(2)}</p>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={isSubmitting}
                  className="w-full rounded-[var(--radius-md)] bg-accent px-4 py-3 font-body text-sm font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ letterSpacing: '0.04em' }}
                >
                  {isSubmitting ? 'Processing...' : 'Checkout'}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
