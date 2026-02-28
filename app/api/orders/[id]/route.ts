import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { VALID_STATUS_TRANSITIONS } from '@/lib/constants'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { rows: orderRows } = await sql`
    SELECT id, customer_name, customer_email, status, total, created_at, updated_at
    FROM orders WHERE id = ${id}
  `

  if (orderRows.length === 0) {
    return NextResponse.json(
      { error: `Order ${id} not found.` },
      { status: 404 }
    )
  }

  const o = orderRows[0]

  const { rows: itemRows } = await sql`
    SELECT id, name, quantity, price, in_stock
    FROM order_items WHERE order_id = ${id}
  `

  const order = {
    id: o.id,
    customerName: o.customer_name,
    customerEmail: o.customer_email,
    status: o.status,
    total: parseFloat(o.total),
    createdAt: o.created_at,
    updatedAt: o.updated_at,
    items: itemRows.map((i) => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      price: parseFloat(i.price),
      inStock: i.in_stock,
    })),
  }

  const validTransitions = VALID_STATUS_TRANSITIONS[order.status] || []

  return NextResponse.json({ order, validTransitions })
}
