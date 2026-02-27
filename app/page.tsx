import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      {/* Brand mark */}
      <h1
        className="font-display text-5xl font-medium text-text"
        style={{ letterSpacing: '0.22em' }}
      >
        HONE
      </h1>
      <p
        className="mt-4 font-body text-base text-text-tertiary"
        style={{ letterSpacing: '0.08em' }}
      >
        Refined essentials
      </p>

      {/* Divider */}
      <div className="mt-10 h-px w-12 bg-border" />

      {/* Description */}
      <p className="mt-10 max-w-md text-center font-body text-sm leading-relaxed text-text-secondary">
        Curated tech accessories designed for the modern workspace.
        Every piece selected for quality, utility, and restraint.
      </p>

      {/* CTA */}
      <Link
        href="/cart"
        className="mt-12 rounded-sm bg-accent px-8 py-3 font-body text-sm font-medium text-white transition-colors hover:bg-accent-dark"
        style={{ letterSpacing: '0.06em' }}
      >
        Shop All
      </Link>

      {/* Secondary link */}
      <Link
        href="/orders"
        className="mt-5 font-body text-sm text-text-tertiary transition-colors hover:text-text-secondary"
      >
        View your orders
      </Link>
    </div>
  )
}
