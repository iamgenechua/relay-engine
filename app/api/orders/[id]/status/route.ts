import { NextRequest, NextResponse } from 'next/server'
import { MOCK_ORDERS, VALID_STATUS_TRANSITIONS } from '@/lib/mock-data'
import { OrderStatus } from '@/lib/types'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const newStatus = body.status as OrderStatus

  const order = MOCK_ORDERS.find((o) => o.id === id)

  if (!order) {
    return NextResponse.json(
      { error: `Order ${id} not found.` },
      { status: 404 }
    )
  }

  const validTransitions = VALID_STATUS_TRANSITIONS[order.status] || []

  if (!validTransitions.includes(newStatus)) {
    return NextResponse.json(
      {
        error: `ERR_INVALID_TRANSITION: Cannot transition from ${order.status} to ${newStatus}. Operation rejected.`,
      },
      { status: 422 }
    )
  }

  // Update the order status (mutates the mock data in-memory for the session)
  order.status = newStatus
  order.updatedAt = new Date().toISOString()

  return NextResponse.json({ order })
}
