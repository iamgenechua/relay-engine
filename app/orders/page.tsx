import Link from 'next/link'
import { MOCK_ORDERS } from '@/lib/mock-data'
import { OrderStatus } from '@/lib/types'

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending:
    'bg-amber-50 text-amber-700 border-amber-200',
  processing:
    'bg-blue-50 text-blue-700 border-blue-200',
  shipped:
    'bg-violet-50 text-violet-700 border-violet-200',
  delivered:
    'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled:
    'bg-neutral-100 text-neutral-500 border-neutral-200',
}

export default function OrdersPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-text">
          Orders
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Manage and track customer orders
        </p>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-subtle">
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">
                Order ID
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">
                Customer
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">
                Status
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">
                Items
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-tertiary">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {MOCK_ORDERS.map((order) => (
              <tr
                key={order.id}
                className="transition-colors hover:bg-bg-subtle/60"
              >
                <td className="px-5 py-4">
                  <Link
                    href={`/orders/${order.id}`}
                    className="font-mono text-sm font-medium text-accent hover:text-accent-dark transition-colors"
                  >
                    {order.id}
                  </Link>
                </td>
                <td className="px-5 py-4">
                  <div className="text-sm font-medium text-text">
                    {order.customerName}
                  </div>
                  <div className="text-xs text-text-tertiary">
                    {order.customerEmail}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[order.status]}`}
                  >
                    {order.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-text-secondary">
                  {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                </td>
                <td className="px-5 py-4 text-right font-mono text-sm font-medium text-text">
                  ${order.total.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
