import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET() {
  const { rows } = await sql`SELECT id, name, price, stock FROM products ORDER BY id`

  const products = rows.map((r) => ({
    id: r.id,
    name: r.name,
    price: parseFloat(r.price),
    stock: r.stock,
  }))

  return NextResponse.json({ products })
}
