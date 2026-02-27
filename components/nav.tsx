'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/orders', label: 'Orders' },
  { href: '/checkout', label: 'Checkout' },
]

export function Nav() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 font-display font-semibold text-text tracking-tight">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-white text-xs font-bold">
            RE
          </div>
          OrderFlow
        </Link>
        <div className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                pathname.startsWith(item.href)
                  ? 'bg-bg-muted text-text'
                  : 'text-text-secondary hover:text-text hover:bg-bg-subtle'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
