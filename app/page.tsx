import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h1 className="font-display text-4xl font-bold tracking-tight text-text">
        OrderFlow
      </h1>
      <p className="mt-3 text-lg text-text-secondary">
        Order management demo — powered by Relay Engine
      </p>
      <Link
        href="/orders"
        className="mt-8 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
      >
        View Orders
      </Link>
    </div>
  )
}
