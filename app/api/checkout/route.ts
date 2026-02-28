import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const items: { productId: string; quantity: number }[] = body.items
  const customerName: string = body.customerName || 'Guest'
  const customerEmail: string = body.customerEmail || 'guest@example.com'

  if (!items || items.length === 0) {
    return NextResponse.json(
      { error: 'No items provided.' },
      { status: 400 }
    )
  }

  // Check stock for each item
  for (const item of items) {
    const { rows } = await sql`SELECT id, name, price, stock FROM products WHERE id = ${item.productId}`

    if (rows.length === 0) {
      return NextResponse.json(
        { error: `Product ${item.productId} not found.` },
        { status: 404 }
      )
    }

    if (rows[0].stock < item.quantity) {
      return NextResponse.json(
        {
          error:
            'CHECKOUT_FAILED: Unable to process order. One or more items could not be fulfilled. [Code: STOCK_INSUFFICIENT]',
        },
        { status: 409 }
      )
    }
  }

  // Generate order ID
  const orderId = `ORD-${String(Math.floor(Math.random() * 9000) + 1000)}`

  // Calculate total and build order items
  let total = 0
  const orderItems: { id: string; name: string; quantity: number; price: number }[] = []

  for (const item of items) {
    const { rows } = await sql`SELECT id, name, price FROM products WHERE id = ${item.productId}`
    const product = rows[0]
    const price = parseFloat(product.price)
    total += price * item.quantity
    orderItems.push({
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: product.name,
      quantity: item.quantity,
      price,
    })
  }

  // Create order
  await sql`
    INSERT INTO orders (id, customer_name, customer_email, status, total)
    VALUES (${orderId}, ${customerName}, ${customerEmail}, 'pending', ${total})
  `

  // Create order items
  for (const oi of orderItems) {
    await sql`
      INSERT INTO order_items (id, order_id, name, quantity, price, in_stock)
      VALUES (${oi.id}, ${orderId}, ${oi.name}, ${oi.quantity}, ${oi.price}, true)
    `
  }

  // Decrement stock
  for (const item of items) {
    await sql`UPDATE products SET stock = stock - ${item.quantity} WHERE id = ${item.productId}`
  }

  return NextResponse.json({ success: true, orderId })
}
