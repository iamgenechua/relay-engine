import { sql } from '@vercel/postgres'

async function seed() {
  console.log('Creating tables...')

  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price NUMERIC(10,2) NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      total NUMERIC(10,2) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price NUMERIC(10,2) NOT NULL,
      in_stock BOOLEAN NOT NULL DEFAULT true
    )
  `

  console.log('Tables created. Seeding data...')

  // Clear existing data (order matters due to foreign keys)
  await sql`DELETE FROM order_items`
  await sql`DELETE FROM orders`
  await sql`DELETE FROM products`

  // Seed products
  await sql`INSERT INTO products (id, name, price, stock) VALUES ('prod-1', 'Wireless Headphones', 79.99, 5)`
  await sql`INSERT INTO products (id, name, price, stock) VALUES ('prod-2', 'USB-C Cable', 12.99, 50)`
  await sql`INSERT INTO products (id, name, price, stock) VALUES ('prod-3', 'Mechanical Keyboard', 149.99, 3)`
  await sql`INSERT INTO products (id, name, price, stock) VALUES ('prod-4', 'Monitor Stand', 45.00, 8)`
  await sql`INSERT INTO products (id, name, price, stock) VALUES ('prod-5', 'Desk Mat', 29.99, 0)`
  await sql`INSERT INTO products (id, name, price, stock) VALUES ('prod-6', 'Webcam HD Pro', 89.99, 2)`

  // Seed orders
  await sql`INSERT INTO orders (id, customer_name, customer_email, status, total, created_at, updated_at)
    VALUES ('ORD-001', 'Sarah Chen', 'sarah@example.com', 'pending', 105.97, '2026-02-27T10:30:00Z', '2026-02-27T10:30:00Z')`
  await sql`INSERT INTO orders (id, customer_name, customer_email, status, total, created_at, updated_at)
    VALUES ('ORD-002', 'Marcus Johnson', 'marcus@example.com', 'processing', 149.99, '2026-02-26T14:15:00Z', '2026-02-27T08:00:00Z')`
  await sql`INSERT INTO orders (id, customer_name, customer_email, status, total, created_at, updated_at)
    VALUES ('ORD-003', 'Aisha Patel', 'aisha@example.com', 'shipped', 74.99, '2026-02-25T09:00:00Z', '2026-02-27T11:00:00Z')`
  await sql`INSERT INTO orders (id, customer_name, customer_email, status, total, created_at, updated_at)
    VALUES ('ORD-004', 'James Wilson', 'james@example.com', 'pending', 149.97, '2026-02-27T13:45:00Z', '2026-02-27T13:45:00Z')`

  // Seed order items
  await sql`INSERT INTO order_items (id, order_id, name, quantity, price, in_stock) VALUES ('item-1', 'ORD-001', 'Wireless Headphones', 1, 79.99, true)`
  await sql`INSERT INTO order_items (id, order_id, name, quantity, price, in_stock) VALUES ('item-2', 'ORD-001', 'USB-C Cable', 2, 12.99, true)`
  await sql`INSERT INTO order_items (id, order_id, name, quantity, price, in_stock) VALUES ('item-3', 'ORD-002', 'Mechanical Keyboard', 1, 149.99, true)`
  await sql`INSERT INTO order_items (id, order_id, name, quantity, price, in_stock) VALUES ('item-4', 'ORD-003', 'Monitor Stand', 1, 45.00, true)`
  await sql`INSERT INTO order_items (id, order_id, name, quantity, price, in_stock) VALUES ('item-5', 'ORD-003', 'Desk Mat', 1, 29.99, false)`
  await sql`INSERT INTO order_items (id, order_id, name, quantity, price, in_stock) VALUES ('item-6', 'ORD-004', 'Webcam HD Pro', 1, 89.99, true)`
  await sql`INSERT INTO order_items (id, order_id, name, quantity, price, in_stock) VALUES ('item-7', 'ORD-004', 'Ring Light', 1, 34.99, true)`
  await sql`INSERT INTO order_items (id, order_id, name, quantity, price, in_stock) VALUES ('item-8', 'ORD-004', 'Microphone Arm', 1, 24.99, true)`

  console.log('Seed complete!')
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
