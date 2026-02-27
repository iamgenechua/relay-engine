'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/orders', label: 'Orders' },
  { href: '/cart', label: 'Cart' },
]

export function Nav() {
  const pathname = usePathname()

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
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`font-body text-sm font-normal transition-colors ${
                pathname.startsWith(item.href)
                  ? 'text-text'
                  : 'text-text-tertiary hover:text-text'
              }`}
              style={{ letterSpacing: '0.04em' }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
