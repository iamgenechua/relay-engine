'use client'

import Link from 'next/link'
import { MOCK_PRODUCTS } from '@/lib/mock-data'
import { useCart } from '@/lib/cart-context'

export default function Home() {
  const { addToCart } = useCart()

  return (
    <div>
      {/* Compact hero */}
      <div className="flex flex-col items-center py-12">
        <h1
          className="font-display text-4xl font-medium text-text"
          style={{ letterSpacing: '0.22em' }}
        >
          HONE
        </h1>
        <p
          className="mt-3 font-body text-sm text-text-tertiary"
          style={{ letterSpacing: '0.08em' }}
        >
          Refined essentials for the modern workspace
        </p>
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {MOCK_PRODUCTS.map((product) => {
          const outOfStock = product.stock === 0 && product.id !== 'prod-5'
          const isDeskMat = product.id === 'prod-5'

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

              {outOfStock ? (
                <button
                  disabled
                  className="rounded-[var(--radius-sm)] border border-border px-4 py-2 font-body text-xs font-normal text-text-tertiary cursor-not-allowed opacity-50"
                  style={{ letterSpacing: '0.04em' }}
                >
                  Out of Stock
                </button>
              ) : (
                <button
                  onClick={() => addToCart(product.id, product.name, product.price)}
                  className="rounded-[var(--radius-sm)] border border-border px-4 py-2 font-body text-xs font-normal text-text-secondary transition-colors hover:border-accent hover:text-accent"
                  style={{ letterSpacing: '0.04em' }}
                >
                  Add to Cart
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Secondary link */}
      <div className="mt-10 text-center">
        <Link
          href="/orders"
          className="font-body text-sm text-text-tertiary transition-colors hover:text-text-secondary"
        >
          View your orders &rarr;
        </Link>
      </div>
    </div>
  )
}
