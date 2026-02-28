'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCart } from '@/lib/cart-context'

export function Nav() {
  const pathname = usePathname()
  const { openDrawer, totalItems } = useCart()

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link
          href="/"
          className="font-display text-xl font-medium text-text"
          style={{ letterSpacing: '0.18em' }}
        >
          HONE
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/orders"
            className={`font-body text-sm font-normal transition-colors ${
              pathname.startsWith('/orders')
                ? 'text-text'
                : 'text-text-tertiary hover:text-text'
            }`}
            style={{ letterSpacing: '0.04em' }}
          >
            Orders
          </Link>
          <button
            onClick={openDrawer}
            className="relative font-body text-sm font-normal text-text-tertiary transition-colors hover:text-text"
            style={{ letterSpacing: '0.04em' }}
          >
            Cart
            {totalItems > 0 && (
              <span className="absolute -right-3.5 -top-2 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-accent text-[10px] font-medium text-white">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </nav>
  )
}
