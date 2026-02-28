import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET() {
  const { rows: orders } = await sql`
    SELECT id, customer_name, customer_email, status, total, created_at, updated_at
    FROM orders
    ORDER BY created_at DESC
  `

  const { rows: items } = await sql`
    SELECT id, order_id, name, quantity, price, in_stock
    FROM order_items
  `

  const itemsByOrder = new Map<string, typeof items>()
  for (const item of items) {
    const list = itemsByOrder.get(item.order_id) ?? []
    list.push(item)
    itemsByOrder.set(item.order_id, list)
  }

  const result = orders.map((o) => ({
    id: o.id,
    customerName: o.customer_name,
    customerEmail: o.customer_email,
    status: o.status,
    total: parseFloat(o.total),
    createdAt: o.created_at,
    updatedAt: o.updated_at,
    items: (itemsByOrder.get(o.id) ?? []).map((i) => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      price: parseFloat(i.price),
      inStock: i.in_stock,
    })),
  }))

  return NextResponse.json({ orders: result })
}
