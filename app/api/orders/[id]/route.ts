import { NextRequest, NextResponse } from 'next/server'
import { MOCK_ORDERS, VALID_STATUS_TRANSITIONS } from '@/lib/mock-data'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const order = MOCK_ORDERS.find((o) => o.id === id)

  if (!order) {
    return NextResponse.json(
      { error: `Order ${id} not found.` },
      { status: 404 }
    )
  }

  const validTransitions = VALID_STATUS_TRANSITIONS[order.status] || []

  return NextResponse.json({ order, validTransitions })
}
