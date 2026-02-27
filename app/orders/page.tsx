import Link from 'next/link'
import { MOCK_ORDERS } from '@/lib/mock-data'
import { OrderStatus } from '@/lib/types'

const STATUS_CONFIG: Record<OrderStatus, { color: string; label: string }> = {
  pending: { color: 'var(--color-status-pending)', label: 'Pending' },
  processing: { color: 'var(--color-status-processing)', label: 'Processing' },
  shipped: { color: 'var(--color-status-shipped)', label: 'Shipped' },
  delivered: { color: 'var(--color-status-delivered)', label: 'Delivered' },
  cancelled: { color: 'var(--color-status-cancelled)', label: 'Cancelled' },
}

export default function OrdersPage() {
  return (
    <div>
      <div className="mb-10">
        <h1 className="font-display text-3xl font-medium text-text">
          My Orders
        </h1>
        <p className="mt-2 font-body text-sm text-text-tertiary">
          Track and manage your recent purchases
        </p>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="px-6 py-4 text-left font-body text-xs font-medium uppercase tracking-wider text-text-tertiary">
                Order
              </th>
              <th className="px-6 py-4 text-left font-body text-xs font-medium uppercase tracking-wider text-text-tertiary">
                Customer
              </th>
              <th className="px-6 py-4 text-left font-body text-xs font-medium uppercase tracking-wider text-text-tertiary">
                Status
              </th>
              <th className="px-6 py-4 text-left font-body text-xs font-medium uppercase tracking-wider text-text-tertiary">
                Items
              </th>
              <th className="px-6 py-4 text-right font-body text-xs font-medium uppercase tracking-wider text-text-tertiary">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {MOCK_ORDERS.map((order) => {
              const status = STATUS_CONFIG[order.status]
              return (
                <tr
                  key={order.id}
                  className="transition-colors hover:bg-bg-subtle/50"
                >
                  <td className="px-6 py-5">
                    <Link
                      href={`/orders/${order.id}`}
                      className="font-mono text-sm font-medium text-accent transition-colors hover:text-accent-dark"
                    >
                      {order.id}
                    </Link>
                  </td>
                  <td className="px-6 py-5">
                    <div className="font-body text-sm text-text">
                      {order.customerName}
                    </div>
                    <div className="font-body text-xs text-text-tertiary">
                      {order.customerEmail}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <span
                        className="block h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      <span
                        className="font-body text-sm"
                        style={{ color: status.color }}
                      >
                        {status.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 font-body text-sm text-text-secondary">
                    {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                  </td>
                  <td className="px-6 py-5 text-right font-mono text-sm font-medium text-text">
                    ${order.total.toFixed(2)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
