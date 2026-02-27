import { NextRequest, NextResponse } from 'next/server'
import { MOCK_PRODUCTS } from '@/lib/mock-data'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const items: { productId: string; quantity: number }[] = body.items

  if (!items || items.length === 0) {
    return NextResponse.json(
      { error: 'No items provided.' },
      { status: 400 }
    )
  }

  // Check stock for each item
  for (const item of items) {
    const product = MOCK_PRODUCTS.find((p) => p.id === item.productId)

    if (!product) {
      return NextResponse.json(
        { error: `Product ${item.productId} not found.` },
        { status: 404 }
      )
    }

    if (product.stock < item.quantity) {
      return NextResponse.json(
        {
          error:
            'CHECKOUT_FAILED: Unable to process order. One or more items could not be fulfilled. [Code: STOCK_INSUFFICIENT]',
        },
        { status: 409 }
      )
    }
  }

  // Generate a random order ID
  const orderId = `ORD-${String(Math.floor(Math.random() * 9000) + 1000)}`

  return NextResponse.json({ success: true, orderId })
}
