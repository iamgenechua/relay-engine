# Relay Engine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a floating AI agent widget (Relay Engine) embedded in an order management demo app for an OpenAI hackathon. The agent captures user feedback in context, investigates autonomously using tools (PostHog events, codebase, business rules), and classifies issues as Bug / Edge Case / UX Issue.

**Architecture:** Next.js 14 App Router with a demo CRUD app (orders). The Relay Engine widget is a React component tree rendered via portal: floating bubble → element selector → chat panel (Vercel AI SDK `useChat`) → agent API route (`streamText` with OpenAI tool calling, maxSteps). PostHog tracks user events; the agent pulls them mid-conversation.

**Tech Stack:** Next.js 14, Tailwind CSS v4, Vercel AI SDK (`ai` + `@ai-sdk/openai`), OpenAI GPT-4o, PostHog JS SDK + REST API, Zod

**Phases:**
- Phase 1 (Today, solo): Project scaffold + demo app + widget UI + animations
- Phase 2 (Tomorrow, with engineer): Agent API + tools + PostHog + dashboard + deploy

---

## Phase 1: Foundation + Demo App (Today)

### Task 1: Scaffold Next.js Project

**Files:**
- Create: `package.json`, `next.config.mjs`, `tailwind.config.ts`, `tsconfig.json`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `postcss.config.mjs`

**Step 1: Initialize Next.js with Tailwind**

Run:
```bash
cd /Users/gene/Documents/relay-engine
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --turbopack
```

When prompted, accept defaults. This will scaffold into the current directory.

Expected: Next.js project with `app/` directory, `tailwind.config.ts`, `package.json`.

**Step 2: Install core dependencies**

Run:
```bash
npm install ai @ai-sdk/openai zod posthog-js framer-motion
```

These are all the deps we need:
- `ai` + `@ai-sdk/openai`: Vercel AI SDK for streaming chat + tool calling
- `zod`: Schema validation for tool parameters
- `posthog-js`: Client-side analytics SDK
- `framer-motion`: Animations (frontend-design skill prefers Motion library for React)

**Step 3: Verify dev server runs**

Run:
```bash
npm run dev
```

Expected: Server starts on http://localhost:3000, default Next.js page renders.

**Step 4: Commit**

```bash
git add -A && git commit -m "scaffold: Next.js 14 with Tailwind, AI SDK, PostHog, Framer Motion"
```

---

### Task 2: Design System — Fonts, Colors, CSS Variables

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Modify: `tailwind.config.ts`

The frontend-design skill demands: NO Inter/Roboto/system fonts. Distinctive typography. Intentional palette. Dark mode chat panel.

**Step 1: Set up Google Fonts in layout.tsx**

Use `next/font/google`. Typography pairing:
- **Display/headings**: `DM Sans` — geometric, warm, modern but not generic
- **Body**: `Source Sans 3` — highly readable, professional
- **Mono (code/technical)**: `JetBrains Mono` — for timeline timestamps, technical details

```tsx
// app/layout.tsx
import { DM_Sans, Source_Sans_3, JetBrains_Mono } from 'next/font/google'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
})

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600'],
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
})
```

Apply as className on `<html>` tag:
```tsx
<html lang="en" className={`${dmSans.variable} ${sourceSans.variable} ${jetbrainsMono.variable}`}>
```

**Step 2: Define color palette in globals.css**

Aesthetic direction: Warm, trustworthy, refined. Think high-end SaaS that feels human.

```css
@layer base {
  :root {
    /* Warm neutrals — NOT cold gray */
    --color-bg: #FAFAF8;
    --color-bg-subtle: #F5F4F0;
    --color-bg-muted: #EEEDEA;
    --color-surface: #FFFFFF;
    --color-text: #1A1918;
    --color-text-secondary: #6B6966;
    --color-text-tertiary: #9C9890;
    --color-border: #E2E0DB;
    --color-border-subtle: #EEEDEA;

    /* Accent — warm teal, not cold blue */
    --color-accent: #0D9488;
    --color-accent-light: #CCFBF1;
    --color-accent-dark: #0F766E;

    /* Classification colors */
    --color-bug: #DC2626;
    --color-bug-light: #FEF2F2;
    --color-edge-case: #D97706;
    --color-edge-case-light: #FFFBEB;
    --color-ux-issue: #2563EB;
    --color-ux-issue-light: #EFF6FF;

    /* Chat panel — dark mode for contrast */
    --color-chat-bg: #1C1C1A;
    --color-chat-surface: #2A2A27;
    --color-chat-text: #F0EFEC;
    --color-chat-text-secondary: #9C9890;
    --color-chat-border: #3A3A36;
    --color-chat-input-bg: #232321;

    /* Shadows */
    --shadow-sm: 0 1px 2px rgba(26, 25, 24, 0.05);
    --shadow-md: 0 4px 12px rgba(26, 25, 24, 0.08);
    --shadow-lg: 0 12px 32px rgba(26, 25, 24, 0.12);
    --shadow-bubble: 0 4px 20px rgba(13, 148, 136, 0.25);

    /* Radii */
    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-lg: 16px;
    --radius-full: 9999px;
  }
}
```

**Step 3: Set up Tailwind config to use CSS variables**

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        bg: {
          DEFAULT: 'var(--color-bg)',
          subtle: 'var(--color-bg-subtle)',
          muted: 'var(--color-bg-muted)',
        },
        surface: 'var(--color-surface)',
        text: {
          DEFAULT: 'var(--color-text)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          subtle: 'var(--color-border-subtle)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          light: 'var(--color-accent-light)',
          dark: 'var(--color-accent-dark)',
        },
        bug: { DEFAULT: 'var(--color-bug)', light: 'var(--color-bug-light)' },
        'edge-case': { DEFAULT: 'var(--color-edge-case)', light: 'var(--color-edge-case-light)' },
        'ux-issue': { DEFAULT: 'var(--color-ux-issue)', light: 'var(--color-ux-issue-light)' },
        chat: {
          bg: 'var(--color-chat-bg)',
          surface: 'var(--color-chat-surface)',
          text: { DEFAULT: 'var(--color-chat-text)', secondary: 'var(--color-chat-text-secondary)' },
          border: 'var(--color-chat-border)',
          input: 'var(--color-chat-input-bg)',
        },
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        bubble: 'var(--shadow-bubble)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        full: 'var(--radius-full)',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

**Step 4: Set global base styles**

In `app/globals.css`, after the Tailwind directives and `:root` variables:

```css
body {
  font-family: var(--font-body), sans-serif;
  color: var(--color-text);
  background: var(--color-bg);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display), sans-serif;
}
```

**Step 5: Verify — dev server shows custom fonts and colors**

Run `npm run dev`, check that the page uses DM Sans / Source Sans, warm background color.

**Step 6: Commit**

```bash
git add -A && git commit -m "design: add typography, color palette, and Tailwind design tokens"
```

---

### Task 3: Mock Data + Types for Orders

**Files:**
- Create: `lib/types.ts`
- Create: `lib/mock-data.ts`

No database. Everything in-memory. Hackathon speed.

**Step 1: Define TypeScript types**

```ts
// lib/types.ts
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

export interface OrderItem {
  id: string
  name: string
  quantity: number
  price: number
  inStock: boolean
}

export interface Order {
  id: string
  customerName: string
  customerEmail: string
  status: OrderStatus
  items: OrderItem[]
  total: number
  createdAt: string
  updatedAt: string
}

export interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
}

export interface Report {
  id: string
  type: 'bug' | 'edge_case' | 'ux_issue'
  title: string
  summary: string
  evidence: string
  userQuote: string
  elementContext: string
  conversationLog: { role: string; content: string }[]
  eventTimeline: TimelineEvent[]
  createdAt: string
}

export interface TimelineEvent {
  id: string
  event: string
  description: string
  timestamp: string
  isError?: boolean
  properties?: Record<string, unknown>
}
```

**Step 2: Create mock data**

```ts
// lib/mock-data.ts
import { Order, CartItem, TimelineEvent } from './types'

export const MOCK_ORDERS: Order[] = [
  {
    id: 'ORD-001',
    customerName: 'Sarah Chen',
    customerEmail: 'sarah@example.com',
    status: 'pending',
    items: [
      { id: 'item-1', name: 'Wireless Headphones', quantity: 1, price: 79.99, inStock: true },
      { id: 'item-2', name: 'USB-C Cable', quantity: 2, price: 12.99, inStock: true },
    ],
    total: 105.97,
    createdAt: '2026-02-27T10:30:00Z',
    updatedAt: '2026-02-27T10:30:00Z',
  },
  {
    id: 'ORD-002',
    customerName: 'Marcus Johnson',
    customerEmail: 'marcus@example.com',
    status: 'processing',
    items: [
      { id: 'item-3', name: 'Mechanical Keyboard', quantity: 1, price: 149.99, inStock: true },
    ],
    total: 149.99,
    createdAt: '2026-02-26T14:15:00Z',
    updatedAt: '2026-02-27T08:00:00Z',
  },
  {
    id: 'ORD-003',
    customerName: 'Aisha Patel',
    customerEmail: 'aisha@example.com',
    status: 'shipped',
    items: [
      { id: 'item-4', name: 'Monitor Stand', quantity: 1, price: 45.00, inStock: true },
      { id: 'item-5', name: 'Desk Mat', quantity: 1, price: 29.99, inStock: false },
    ],
    total: 74.99,
    createdAt: '2026-02-25T09:00:00Z',
    updatedAt: '2026-02-27T11:00:00Z',
  },
  {
    id: 'ORD-004',
    customerName: 'James Wilson',
    customerEmail: 'james@example.com',
    status: 'pending',
    items: [
      { id: 'item-6', name: 'Webcam HD Pro', quantity: 1, price: 89.99, inStock: true },
      { id: 'item-7', name: 'Ring Light', quantity: 1, price: 34.99, inStock: true },
      { id: 'item-8', name: 'Microphone Arm', quantity: 1, price: 24.99, inStock: true },
    ],
    total: 149.97,
    createdAt: '2026-02-27T13:45:00Z',
    updatedAt: '2026-02-27T13:45:00Z',
  },
]

// Valid status transitions — the business rule the agent should discover
export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
}

export const MOCK_PRODUCTS = [
  { id: 'prod-1', name: 'Wireless Headphones', price: 79.99, stock: 5 },
  { id: 'prod-2', name: 'USB-C Cable', price: 12.99, stock: 50 },
  { id: 'prod-3', name: 'Mechanical Keyboard', price: 149.99, stock: 3 },
  { id: 'prod-4', name: 'Monitor Stand', price: 45.00, stock: 8 },
  { id: 'prod-5', name: 'Desk Mat', price: 29.99, stock: 0 },  // OUT OF STOCK — triggers edge case
  { id: 'prod-6', name: 'Webcam HD Pro', price: 89.99, stock: 2 },
]

// Mock timeline events — what PostHog would capture
export const MOCK_TIMELINE_EVENTS: TimelineEvent[] = [
  { id: 'evt-1', event: 'pageview', description: 'Viewed Orders list', timestamp: '0:00' },
  { id: 'evt-2', event: 'click', description: 'Opened Order ORD-001', timestamp: '0:03' },
  { id: 'evt-3', event: 'click', description: 'Clicked status dropdown', timestamp: '0:07' },
  { id: 'evt-4', event: 'click', description: 'Selected "Shipped"', timestamp: '0:09' },
  { id: 'evt-5', event: 'api_error', description: 'Status update failed: Invalid transition', timestamp: '0:10', isError: true },
]
```

**Step 3: Commit**

```bash
git add lib/types.ts lib/mock-data.ts && git commit -m "data: add types and mock order data with intentional broken flows"
```

---

### Task 4: App Layout + Navigation

**Files:**
- Modify: `app/layout.tsx`
- Create: `components/nav.tsx`

**Step 1: Build navigation component**

A top nav bar with the demo app branding. Clean, warm, not generic.

```tsx
// components/nav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/orders', label: 'Orders' },
  { href: '/checkout', label: 'Checkout' },
]

export function Nav() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 font-display font-semibold text-text tracking-tight">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-white text-xs font-bold">
            RE
          </div>
          OrderFlow
        </Link>
        <div className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                pathname.startsWith(item.href)
                  ? 'bg-bg-muted text-text'
                  : 'text-text-secondary hover:text-text hover:bg-bg-subtle'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
```

**Step 2: Update app/layout.tsx with Nav + font classes**

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import { DM_Sans, Source_Sans_3, JetBrains_Mono } from 'next/font/google'
import { Nav } from '@/components/nav'
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
})

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600'],
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: "OrderFlow — Relay Engine Demo",
  description: "Demo app for Relay Engine hackathon",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${sourceSans.variable} ${jetbrainsMono.variable}`}>
      <body>
        <Nav />
        <main className="mx-auto max-w-5xl px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
```

**Step 3: Create minimal home page**

```tsx
// app/page.tsx
import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h1 className="font-display text-4xl font-bold tracking-tight text-text">
        OrderFlow
      </h1>
      <p className="mt-3 text-lg text-text-secondary">
        Order management demo — powered by Relay Engine
      </p>
      <Link
        href="/orders"
        className="mt-8 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
      >
        View Orders
      </Link>
    </div>
  )
}
```

**Step 4: Verify — nav renders, routing works**

Run `npm run dev`. Check that:
- Nav bar shows with "RE" badge + "OrderFlow"
- Nav links highlight on active route
- Home page renders with styled heading

**Step 5: Commit**

```bash
git add -A && git commit -m "ui: add app layout, navigation, and home page"
```

---

### Task 5: Orders List Page

**Files:**
- Create: `app/orders/page.tsx`

**Step 1: Build orders list with status badges**

```tsx
// app/orders/page.tsx
import Link from 'next/link'
import { MOCK_ORDERS } from '@/lib/mock-data'
import { OrderStatus } from '@/lib/types'

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  processing: 'bg-blue-50 text-blue-700 border-blue-200',
  shipped: 'bg-violet-50 text-violet-700 border-violet-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-neutral-100 text-neutral-500 border-neutral-200',
}

export default function OrdersPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">Orders</h1>
        <p className="mt-1 text-sm text-text-secondary">Manage and track customer orders</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-bg-subtle">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">Order</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">Items</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-tertiary">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {MOCK_ORDERS.map((order) => (
              <tr key={order.id} className="transition-colors hover:bg-bg-subtle">
                <td className="px-4 py-3">
                  <Link href={`/orders/${order.id}`} className="font-mono text-sm font-medium text-accent hover:underline">
                    {order.id}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-text">{order.customerName}</div>
                  <div className="text-xs text-text-tertiary">{order.customerEmail}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[order.status]}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">
                  {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm font-medium">
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
```

**Step 2: Verify — orders table renders with styled status badges**

Navigate to `/orders`. Check: table renders, status badges are color-coded, order links work.

**Step 3: Commit**

```bash
git add app/orders/page.tsx && git commit -m "page: orders list with status badges and mock data"
```

---

### Task 6: Order Detail Page (with Broken Status Flow)

**Files:**
- Create: `app/orders/[id]/page.tsx`
- Create: `app/api/orders/[id]/status/route.ts`

This is **Demo Flow 1** — the user tries to change status from "Pending" → "Shipped" and gets a cryptic error.

**Step 1: Build the API route that enforces status transitions**

```ts
// app/api/orders/[id]/status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { MOCK_ORDERS, VALID_STATUS_TRANSITIONS } from '@/lib/mock-data'
import { OrderStatus } from '@/lib/types'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { status: newStatus } = await req.json() as { status: OrderStatus }
  const order = MOCK_ORDERS.find(o => o.id === id)

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const validTransitions = VALID_STATUS_TRANSITIONS[order.status]
  if (!validTransitions.includes(newStatus)) {
    // Intentionally cryptic error — this is what the agent should catch
    return NextResponse.json(
      { error: `ERR_INVALID_TRANSITION: Cannot transition from ${order.status} to ${newStatus}. Operation rejected.` },
      { status: 422 }
    )
  }

  // In a real app this would persist. For the demo, just return success.
  order.status = newStatus
  order.updatedAt = new Date().toISOString()
  return NextResponse.json({ order })
}
```

**Step 2: Build the order detail page**

```tsx
// app/orders/[id]/page.tsx
'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { MOCK_ORDERS } from '@/lib/mock-data'
import { OrderStatus } from '@/lib/types'

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  processing: 'bg-blue-50 text-blue-700 border-blue-200',
  shipped: 'bg-violet-50 text-violet-700 border-violet-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-neutral-100 text-neutral-500 border-neutral-200',
}

const ALL_STATUSES: OrderStatus[] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const order = MOCK_ORDERS.find(o => o.id === id)
  const [status, setStatus] = useState<OrderStatus>(order?.status ?? 'pending')
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  if (!order) {
    return <div className="py-20 text-center text-text-secondary">Order not found</div>
  }

  const handleStatusChange = async (newStatus: OrderStatus) => {
    setIsUpdating(true)
    setError(null)
    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error)
      } else {
        setStatus(newStatus)
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div>
      <Link href="/orders" className="mb-4 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text">
        ← Back to Orders
      </Link>

      <div className="mt-4 rounded-lg border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">{order.id}</h1>
            <p className="mt-1 text-sm text-text-secondary">{order.customerName} · {order.customerEmail}</p>
          </div>
          <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium capitalize ${STATUS_STYLES[status]}`}>
            {status}
          </span>
        </div>

        {/* Status update — intentionally shows ALL statuses, even invalid ones */}
        <div className="mt-6 border-t border-border-subtle pt-6">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Update Status</h2>
          <div className="flex flex-wrap gap-2">
            {ALL_STATUSES.filter(s => s !== status).map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                disabled={isUpdating}
                className="rounded-md border border-border bg-bg-subtle px-3 py-1.5 text-sm font-medium capitalize text-text-secondary transition-colors hover:bg-bg-muted hover:text-text disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Cryptic error toast — this is what the user reports */}
          {error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Order items */}
        <div className="mt-6 border-t border-border-subtle pt-6">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Items</h2>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-md border border-border-subtle bg-bg-subtle px-4 py-3">
                <div>
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="ml-2 text-xs text-text-tertiary">× {item.quantity}</span>
                </div>
                <span className="font-mono text-sm">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-end border-t border-border-subtle pt-3">
            <span className="font-display text-lg font-bold">${order.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 3: Verify the broken flow**

1. Navigate to `/orders` → click `ORD-001` (status: Pending)
2. Click "Shipped" button
3. Should see red error: `ERR_INVALID_TRANSITION: Cannot transition from pending to shipped. Operation rejected.`
4. Click "Processing" → should succeed (valid transition)

**Step 4: Commit**

```bash
git add app/orders/\[id\]/page.tsx app/api/orders/\[id\]/status/route.ts && git commit -m "page: order detail with intentionally broken status transition flow"
```

---

### Task 7: Checkout Page (with Broken Inventory Flow)

**Files:**
- Create: `app/checkout/page.tsx`
- Create: `app/api/checkout/route.ts`

**Demo Flow 2** — user adds items including an out-of-stock one, checkout fails.

**Step 1: Build checkout API**

```ts
// app/api/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { MOCK_PRODUCTS } from '@/lib/mock-data'

export async function POST(req: NextRequest) {
  const { items } = await req.json() as { items: { productId: string; quantity: number }[] }

  // Check stock — this will fail for out-of-stock items
  for (const item of items) {
    const product = MOCK_PRODUCTS.find(p => p.id === item.productId)
    if (!product) {
      return NextResponse.json({ error: `Product ${item.productId} not found` }, { status: 404 })
    }
    if (product.stock < item.quantity) {
      // Intentionally unhelpful error
      return NextResponse.json(
        { error: `CHECKOUT_FAILED: Unable to process order. One or more items could not be fulfilled. [Code: STOCK_INSUFFICIENT]` },
        { status: 409 }
      )
    }
  }

  return NextResponse.json({ success: true, orderId: `ORD-${Date.now().toString().slice(-4)}` })
}
```

**Step 2: Build checkout page**

```tsx
// app/checkout/page.tsx
'use client'

import { useState } from 'react'
import { MOCK_PRODUCTS } from '@/lib/mock-data'

export default function CheckoutPage() {
  const [cart, setCart] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const cartItems = Object.entries(cart).filter(([, qty]) => qty > 0)
  const total = cartItems.reduce((sum, [id, qty]) => {
    const product = MOCK_PRODUCTS.find(p => p.id === id)
    return sum + (product ? product.price * qty : 0)
  }, 0)

  const updateCart = (productId: string, delta: number) => {
    setCart(prev => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] || 0) + delta),
    }))
  }

  const handleCheckout = async () => {
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems.map(([id, qty]) => ({ productId: id, quantity: qty })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error)
      } else {
        setSuccess(`Order ${data.orderId} placed successfully!`)
        setCart({})
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">Checkout</h1>
        <p className="mt-1 text-sm text-text-secondary">Add items to your cart and place an order</p>
      </div>

      {/* Product catalog */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MOCK_PRODUCTS.map((product) => (
          <div key={product.id} className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold">{product.name}</h3>
                <p className="font-mono text-sm text-text-secondary">${product.price.toFixed(2)}</p>
              </div>
              {/* Intentionally does NOT show out-of-stock warning — this is the trap */}
              <span className={`text-xs font-medium ${product.stock > 0 ? 'text-emerald-600' : 'text-text-tertiary'}`}>
                {product.stock > 0 ? `${product.stock} left` : 'Limited'}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => updateCart(product.id, -1)}
                className="flex h-7 w-7 items-center justify-center rounded border border-border text-sm text-text-secondary hover:bg-bg-subtle"
              >
                −
              </button>
              <span className="w-8 text-center font-mono text-sm">{cart[product.id] || 0}</span>
              <button
                onClick={() => updateCart(product.id, 1)}
                className="flex h-7 w-7 items-center justify-center rounded border border-border text-sm text-text-secondary hover:bg-bg-subtle"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Cart summary + checkout */}
      {cartItems.length > 0 && (
        <div className="mt-6 rounded-lg border border-border bg-surface p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold mb-4">Cart Summary</h2>
          <div className="space-y-2 mb-4">
            {cartItems.map(([id, qty]) => {
              const product = MOCK_PRODUCTS.find(p => p.id === id)!
              return (
                <div key={id} className="flex justify-between text-sm">
                  <span>{product.name} × {qty}</span>
                  <span className="font-mono">${(product.price * qty).toFixed(2)}</span>
                </div>
              )
            })}
          </div>
          <div className="border-t border-border-subtle pt-3 flex justify-between items-center">
            <span className="font-display text-lg font-bold">Total: ${total.toFixed(2)}</span>
            <button
              onClick={handleCheckout}
              disabled={isSubmitting}
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
            >
              {isSubmitting ? 'Processing...' : 'Place Order'}
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

Note: The "Desk Mat" product has `stock: 0` but shows "Limited" instead of "Out of Stock" — that's the intentional UX trap. The checkout API will reject it.

**Step 3: Verify the broken flow**

1. Navigate to `/checkout`
2. Add "Desk Mat" (stock: 0, shows "Limited") to cart
3. Click "Place Order"
4. Should see error: `CHECKOUT_FAILED: Unable to process order. One or more items could not be fulfilled. [Code: STOCK_INSUFFICIENT]`

**Step 4: Commit**

```bash
git add app/checkout/page.tsx app/api/checkout/route.ts && git commit -m "page: checkout with intentionally broken inventory flow"
```

---

### Task 8: Floating Bubble Component

**Files:**
- Create: `components/relay-engine/floating-bubble.tsx`

This is the entry point to Relay Engine. A polished, animated bubble in the bottom-right.

**Step 1: Build the floating bubble**

```tsx
// components/relay-engine/floating-bubble.tsx
'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface FloatingBubbleProps {
  isReportMode: boolean
  hasError: boolean
  onClick: () => void
}

export function FloatingBubble({ isReportMode, hasError, onClick }: FloatingBubbleProps) {
  return (
    <motion.button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-[9999] flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      style={{
        background: isReportMode
          ? 'linear-gradient(135deg, #0F766E, #0D9488)'
          : hasError
            ? 'linear-gradient(135deg, #DC2626, #EF4444)'
            : 'linear-gradient(135deg, #1C1C1A, #2A2A27)',
      }}
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      aria-label={isReportMode ? 'Exit report mode' : 'Open Relay Engine'}
    >
      {/* Breathing pulse ring */}
      <AnimatePresence>
        {!isReportMode && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: hasError
                ? 'radial-gradient(circle, rgba(220,38,38,0.3) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(13,148,136,0.2) 0%, transparent 70%)',
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.6, 0, 0.6],
            }}
            transition={{
              duration: hasError ? 1.5 : 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </AnimatePresence>

      {/* Icon */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {isReportMode ? (
          // Crosshair icon when in report mode
          <>
            <circle cx="12" cy="12" r="10" />
            <line x1="22" y1="12" x2="18" y2="12" />
            <line x1="6" y1="12" x2="2" y2="12" />
            <line x1="12" y1="6" x2="12" y2="2" />
            <line x1="12" y1="22" x2="12" y2="18" />
          </>
        ) : (
          // Chat bubble icon
          <>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </>
        )}
      </svg>
    </motion.button>
  )
}
```

**Step 2: Verify — bubble renders with breathing animation**

We'll wire this up in a later task. For now, just verify the component file has no syntax errors by importing it temporarily in `app/page.tsx`.

**Step 3: Commit**

```bash
git add components/relay-engine/floating-bubble.tsx && git commit -m "widget: floating bubble with breathing pulse and report mode toggle"
```

---

### Task 9: Event Timeline Component

**Files:**
- Create: `components/relay-engine/event-timeline.tsx`

The animated step-by-step timeline. Each event staggers in. Error events pulse red. This is the "jaw-drop" moment.

**Step 1: Build the event timeline**

```tsx
// components/relay-engine/event-timeline.tsx
'use client'

import { motion } from 'framer-motion'
import { TimelineEvent } from '@/lib/types'

interface EventTimelineProps {
  events: TimelineEvent[]
  isVisible: boolean
}

const EVENT_ICONS: Record<string, string> = {
  pageview: '📄',
  click: '👆',
  api_error: '⚠️',
  form_submit: '📝',
  navigation: '🔗',
}

export function EventTimeline({ events, isVisible }: EventTimelineProps) {
  if (!isVisible || events.length === 0) return null

  return (
    <div className="border-b border-chat-border px-4 py-3">
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        transition={{ duration: 0.3 }}
      >
        <p className="mb-2.5 font-mono text-[10px] font-medium uppercase tracking-widest text-chat-text-secondary">
          Your journey
        </p>
        <div className="relative space-y-0">
          {/* Vertical line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-chat-border" />

          {events.map((event, index) => (
            <motion.div
              key={event.id}
              className="relative flex items-start gap-3 py-1"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: index * 0.15,
                duration: 0.3,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {/* Dot */}
              <div className="relative z-10 mt-1.5 flex-shrink-0">
                {event.isError ? (
                  <motion.div
                    className="h-[15px] w-[15px] rounded-full bg-red-500"
                    animate={{
                      boxShadow: [
                        '0 0 0 0 rgba(239,68,68,0.4)',
                        '0 0 0 6px rgba(239,68,68,0)',
                        '0 0 0 0 rgba(239,68,68,0)',
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                ) : (
                  <div className="h-[15px] w-[15px] rounded-full border-2 border-chat-border bg-chat-surface" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`text-[13px] leading-snug ${event.isError ? 'font-medium text-red-400' : 'text-chat-text'}`}>
                  <span className="mr-1.5">{EVENT_ICONS[event.event] || '●'}</span>
                  {event.description}
                </p>
              </div>

              {/* Timestamp */}
              <span className="flex-shrink-0 font-mono text-[10px] text-chat-text-secondary mt-0.5">
                {event.timestamp}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/relay-engine/event-timeline.tsx && git commit -m "widget: animated event timeline with staggered reveals and error pulses"
```

---

### Task 10: Classification Card Component

**Files:**
- Create: `components/relay-engine/classification-card.tsx`

The dramatic verdict reveal — the payoff of the whole experience.

**Step 1: Build the classification card**

```tsx
// components/relay-engine/classification-card.tsx
'use client'

import { motion } from 'framer-motion'

interface ClassificationCardProps {
  type: 'bug' | 'edge_case' | 'ux_issue'
  title: string
  summary: string
  evidence: string
}

const TYPE_CONFIG = {
  bug: {
    label: 'Bug Detected',
    emoji: '🐛',
    borderColor: 'border-red-500/40',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-400',
    badgeBg: 'bg-red-500/20',
  },
  edge_case: {
    label: 'Edge Case Found',
    emoji: '🔍',
    borderColor: 'border-amber-500/40',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-400',
    badgeBg: 'bg-amber-500/20',
  },
  ux_issue: {
    label: 'UX Issue',
    emoji: '🎯',
    borderColor: 'border-blue-500/40',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-400',
    badgeBg: 'bg-blue-500/20',
  },
}

export function ClassificationCard({ type, title, summary, evidence }: ClassificationCardProps) {
  const config = TYPE_CONFIG[type]

  return (
    <motion.div
      className={`mx-4 my-3 overflow-hidden rounded-xl border ${config.borderColor} ${config.bgColor}`}
      initial={{ scale: 0.8, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 24,
        mass: 0.8,
      }}
    >
      <div className="p-4">
        {/* Badge */}
        <motion.div
          className={`inline-flex items-center gap-1.5 rounded-full ${config.badgeBg} px-3 py-1`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 15 }}
        >
          <span>{config.emoji}</span>
          <span className={`text-xs font-semibold ${config.textColor}`}>{config.label}</span>
        </motion.div>

        {/* Title */}
        <motion.h3
          className="mt-3 font-display text-[15px] font-semibold text-chat-text"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {title}
        </motion.h3>

        {/* Summary */}
        <motion.p
          className="mt-1.5 text-[13px] leading-relaxed text-chat-text-secondary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {summary}
        </motion.p>

        {/* Evidence */}
        <motion.div
          className="mt-3 rounded-lg bg-chat-bg/50 px-3 py-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p className="font-mono text-[10px] uppercase tracking-wider text-chat-text-secondary mb-1">Evidence</p>
          <p className="text-[12px] leading-relaxed text-chat-text-secondary">{evidence}</p>
        </motion.div>

        {/* Completion line */}
        <motion.div
          className="mt-4 flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <motion.div
            className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8, type: 'spring', stiffness: 400, damping: 15 }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </motion.div>
          <span className="text-[12px] text-emerald-400/80">
            Reported to the team — you won't have to explain this again.
          </span>
        </motion.div>
      </div>
    </motion.div>
  )
}
```

**Step 2: Commit**

```bash
git add components/relay-engine/classification-card.tsx && git commit -m "widget: classification card with spring animation and verdict reveal"
```

---

### Task 11: Chat Panel Component

**Files:**
- Create: `components/relay-engine/chat-panel.tsx`

The main chat interface. Uses Vercel AI SDK's `useChat` hook. For today, we wire up the UI; the actual API route comes tomorrow.

**Step 1: Build the chat panel**

```tsx
// components/relay-engine/chat-panel.tsx
'use client'

import { useRef, useEffect } from 'react'
import { useChat, type Message } from 'ai/react'
import { motion, AnimatePresence } from 'framer-motion'
import { TimelineEvent } from '@/lib/types'
import { EventTimeline } from './event-timeline'
import { ClassificationCard } from './classification-card'

interface ChatPanelProps {
  isOpen: boolean
  onClose: () => void
  elementContext: {
    elementName: string
    cssSelector: string
    visibleText: string
    boundingBox: DOMRect | null
  } | null
  timelineEvents: TimelineEvent[]
  autoTriggered?: boolean
  errorMessage?: string
}

interface ClassificationData {
  type: 'bug' | 'edge_case' | 'ux_issue'
  title: string
  summary: string
  evidence: string
}

function parseClassification(messages: Message[]): ClassificationData | null {
  // Look for tool invocation results in messages
  for (const msg of messages) {
    if (msg.role === 'assistant' && msg.parts) {
      for (const part of msg.parts) {
        if (part.type === 'tool-invocation' && part.toolName === 'classifyIssue' && part.state === 'result') {
          return part.result as ClassificationData
        }
      }
    }
  }
  return null
}

export function ChatPanel({
  isOpen,
  onClose,
  elementContext,
  timelineEvents,
  autoTriggered,
  errorMessage,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: {
      elementContext,
      autoTriggered,
      errorMessage,
    },
  })

  const classification = parseClassification(messages)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, classification])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed bottom-0 right-0 z-[9998] flex h-[600px] w-[420px] flex-col overflow-hidden rounded-t-2xl rounded-bl-2xl border border-chat-border bg-chat-bg shadow-2xl"
          style={{ bottom: '76px', right: '24px' }}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-chat-border px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/20">
                <div className="h-2 w-2 rounded-full bg-accent" />
              </div>
              <div>
                <h3 className="font-display text-sm font-semibold text-chat-text">Relay Engine</h3>
                <p className="text-[10px] text-chat-text-secondary">AI Support Agent</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md text-chat-text-secondary transition-colors hover:bg-chat-surface hover:text-chat-text"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Timeline */}
          <EventTimeline events={timelineEvents} isVisible={timelineEvents.length > 0} />

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.filter(m => m.content).map((message) => (
              <motion.div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-accent text-white rounded-br-md'
                      : 'bg-chat-surface text-chat-text rounded-bl-md'
                  }`}
                >
                  {message.content}
                </div>
              </motion.div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <motion.div
                className="flex justify-start"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="flex gap-1 rounded-2xl rounded-bl-md bg-chat-surface px-4 py-3">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-chat-text-secondary"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Classification card */}
            {classification && (
              <ClassificationCard
                type={classification.type}
                title={classification.title}
                summary={classification.summary}
                evidence={classification.evidence}
              />
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t border-chat-border p-3">
            <div className="flex items-center gap-2 rounded-xl bg-chat-input px-3 py-2">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Describe what happened..."
                className="flex-1 bg-transparent text-[13px] text-chat-text placeholder-chat-text-secondary outline-none"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white transition-colors hover:bg-accent-dark disabled:opacity-30"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

**Step 2: Commit**

```bash
git add components/relay-engine/chat-panel.tsx && git commit -m "widget: chat panel with streaming messages, timeline, and classification card"
```

---

### Task 12: Element Selector Overlay

**Files:**
- Create: `components/relay-engine/element-selector.tsx`

When report mode is active, this overlays the page and highlights elements on hover. Click to select.

**Step 1: Build the element selector**

```tsx
// components/relay-engine/element-selector.tsx
'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ElementSelectorProps {
  isActive: boolean
  onElementSelect: (context: {
    elementName: string
    cssSelector: string
    visibleText: string
    boundingBox: DOMRect
  }) => void
}

function getCssSelector(el: Element): string {
  if (el.id) return `#${el.id}`
  const parts: string[] = []
  let current: Element | null = el
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase()
    if (current.className && typeof current.className === 'string') {
      const meaningful = current.className.split(' ').filter(c => c && !c.startsWith('__') && c.length < 30).slice(0, 2)
      if (meaningful.length) selector += '.' + meaningful.join('.')
    }
    parts.unshift(selector)
    current = current.parentElement
    if (parts.length >= 3) break
  }
  return parts.join(' > ')
}

function getElementName(el: Element): string {
  const tag = el.tagName.toLowerCase()
  if (el.getAttribute('role')) return `${tag}[role="${el.getAttribute('role')}"]`
  if (el.getAttribute('aria-label')) return el.getAttribute('aria-label')!
  const text = el.textContent?.trim().slice(0, 40)
  if (text) return `<${tag}> "${text}${(el.textContent?.trim().length ?? 0) > 40 ? '...' : ''}"`
  return `<${tag}>`
}

export function ElementSelector({ isActive, onElementSelect }: ElementSelectorProps) {
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null)
  const [hoverName, setHoverName] = useState<string>('')

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const el = document.elementFromPoint(e.clientX, e.clientY)
    if (!el || (el as HTMLElement).closest('[data-relay-engine]')) {
      setHoverRect(null)
      return
    }
    setHoverRect(el.getBoundingClientRect())
    setHoverName(getElementName(el))
  }, [])

  const handleClick = useCallback((e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const el = document.elementFromPoint(e.clientX, e.clientY)
    if (!el || (el as HTMLElement).closest('[data-relay-engine]')) return

    onElementSelect({
      elementName: getElementName(el),
      cssSelector: getCssSelector(el),
      visibleText: el.textContent?.trim().slice(0, 200) || '',
      boundingBox: el.getBoundingClientRect(),
    })
  }, [onElementSelect])

  useEffect(() => {
    if (!isActive) {
      setHoverRect(null)
      return
    }
    document.addEventListener('mousemove', handleMouseMove, true)
    document.addEventListener('click', handleClick, true)
    document.body.style.cursor = 'crosshair'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, true)
      document.removeEventListener('click', handleClick, true)
      document.body.style.cursor = ''
    }
  }, [isActive, handleMouseMove, handleClick])

  if (!isActive) return null

  return (
    <>
      {/* Highlight overlay */}
      <AnimatePresence>
        {hoverRect && (
          <motion.div
            data-relay-engine
            className="pointer-events-none fixed z-[9997] rounded border-2 border-accent/60"
            style={{
              left: hoverRect.left - 2,
              top: hoverRect.top - 2,
              width: hoverRect.width + 4,
              height: hoverRect.height + 4,
              background: 'rgba(13, 148, 136, 0.08)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          />
        )}
      </AnimatePresence>

      {/* Element name tooltip */}
      <AnimatePresence>
        {hoverRect && hoverName && (
          <motion.div
            data-relay-engine
            className="pointer-events-none fixed z-[9997] rounded-md bg-chat-bg px-2.5 py-1 text-[11px] font-mono text-chat-text shadow-lg border border-chat-border"
            style={{
              left: hoverRect.left,
              top: hoverRect.bottom + 6,
            }}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            {hoverName}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mode indicator */}
      <motion.div
        data-relay-engine
        className="fixed left-1/2 top-4 z-[9997] -translate-x-1/2 rounded-full border border-accent/30 bg-chat-bg px-4 py-1.5 shadow-lg"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
      >
        <span className="text-xs font-medium text-accent">
          Click an element to report an issue
        </span>
      </motion.div>
    </>
  )
}
```

**Step 2: Commit**

```bash
git add components/relay-engine/element-selector.tsx && git commit -m "widget: element selector overlay with hover highlighting and CSS selector capture"
```

---

### Task 13: RelayEngine Wrapper Component

**Files:**
- Create: `components/relay-engine/relay-engine.tsx`
- Modify: `app/layout.tsx`

Ties everything together: bubble, element selector, chat panel. Manages state transitions.

**Step 1: Build the wrapper**

```tsx
// components/relay-engine/relay-engine.tsx
'use client'

import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FloatingBubble } from './floating-bubble'
import { ElementSelector } from './element-selector'
import { ChatPanel } from './chat-panel'
import { MOCK_TIMELINE_EVENTS } from '@/lib/mock-data'
import { TimelineEvent } from '@/lib/types'

type Mode = 'idle' | 'report' | 'chat'

interface ElementContext {
  elementName: string
  cssSelector: string
  visibleText: string
  boundingBox: DOMRect | null
}

export function RelayEngine() {
  const [mode, setMode] = useState<Mode>('idle')
  const [elementContext, setElementContext] = useState<ElementContext | null>(null)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [autoTriggered, setAutoTriggered] = useState(false)
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleBubbleClick = useCallback(() => {
    if (mode === 'idle') {
      setMode('report')
    } else if (mode === 'report') {
      setMode('idle')
    } else if (mode === 'chat') {
      setMode('idle')
      setElementContext(null)
      setAutoTriggered(false)
      setTimelineEvents([])
    }
  }, [mode])

  const handleElementSelect = useCallback((context: {
    elementName: string
    cssSelector: string
    visibleText: string
    boundingBox: DOMRect
  }) => {
    setElementContext(context)
    setTimelineEvents(MOCK_TIMELINE_EVENTS) // TODO: Replace with PostHog events
    setMode('chat')
  }, [])

  const handleChatClose = useCallback(() => {
    setMode('idle')
    setElementContext(null)
    setAutoTriggered(false)
    setHasError(false)
    setErrorMessage('')
    setTimelineEvents([])
  }, [])

  // Listen for error events from the app
  useEffect(() => {
    const handleAppError = (e: CustomEvent) => {
      setHasError(true)
      setErrorMessage(e.detail?.message || 'An error occurred')
      setTimelineEvents(MOCK_TIMELINE_EVENTS) // TODO: Replace with PostHog events

      // Auto-open after a short delay
      setTimeout(() => {
        setAutoTriggered(true)
        setMode('chat')
      }, 1500)
    }

    window.addEventListener('relay-engine:error', handleAppError as EventListener)
    return () => window.removeEventListener('relay-engine:error', handleAppError as EventListener)
  }, [])

  if (!mounted) return null

  return createPortal(
    <div data-relay-engine>
      <FloatingBubble
        isReportMode={mode === 'report'}
        hasError={hasError && mode === 'idle'}
        onClick={handleBubbleClick}
      />
      <ElementSelector
        isActive={mode === 'report'}
        onElementSelect={handleElementSelect}
      />
      <ChatPanel
        isOpen={mode === 'chat'}
        onClose={handleChatClose}
        elementContext={elementContext}
        timelineEvents={timelineEvents}
        autoTriggered={autoTriggered}
        errorMessage={errorMessage}
      />
    </div>,
    document.body
  )
}
```

**Step 2: Add RelayEngine to layout.tsx**

Add `<RelayEngine />` to the layout body, after `</main>`:

```tsx
// In app/layout.tsx, add import at top:
import { RelayEngine } from '@/components/relay-engine/relay-engine'

// In the body, after </main>:
<RelayEngine />
```

**Step 3: Wire error dispatching into the order detail page**

In `app/orders/[id]/page.tsx`, after `setError(data.error)`, add:

```tsx
// Dispatch error event for Relay Engine auto-trigger
window.dispatchEvent(new CustomEvent('relay-engine:error', {
  detail: { message: data.error }
}))
```

Do the same in `app/checkout/page.tsx` after `setError(data.error)`.

**Step 4: Verify the full flow**

1. Run `npm run dev`
2. See floating bubble in bottom-right with breathing animation
3. Click bubble → report mode → crosshair cursor, top banner says "Click an element to report"
4. Hover elements → teal highlight overlay + element name tooltip
5. Click an element → chat panel slides in with timeline animation
6. Navigate to `/orders/ORD-001` → click "Shipped" → error appears → bubble turns red and pulses → chat auto-opens after 1.5s

**Step 5: Commit**

```bash
git add -A && git commit -m "widget: wire up RelayEngine wrapper with mode management and error auto-trigger"
```

---

## Phase 2: Agent Brains + Integrations (Tomorrow, with Engineer)

### Task 14: Business Rules Document

**Files:**
- Create: `docs/BUSINESS_RULES.md`

The agent reads this to determine if reported behavior is intentional.

**Step 1: Write business rules**

```markdown
# Business Rules — OrderFlow

## Order Status Transitions

Orders follow a strict status lifecycle:
- **pending** → processing, cancelled
- **processing** → shipped, cancelled
- **shipped** → delivered
- **delivered** → (terminal state)
- **cancelled** → (terminal state)

Invalid transitions are rejected with error code ERR_INVALID_TRANSITION. This is intentional — orders must pass through each stage for fulfillment tracking. The UI currently shows all status options regardless of validity. This is a known UX gap (not a bug).

## Inventory & Checkout

- Stock is checked at checkout time, not when items are added to cart
- If stock becomes 0 between add-to-cart and checkout, the order is rejected with CHECKOUT_FAILED / STOCK_INSUFFICIENT
- The product catalog shows "Limited" for items with 0 stock instead of "Out of Stock" — this is a known UX issue
- There is no cart reservation system. This is a known limitation.

## Error Messages

Error messages are currently technical and not user-friendly. Codes like ERR_INVALID_TRANSITION and STOCK_INSUFFICIENT are meant for debugging, not end users. Improving error copy is a planned enhancement.
```

**Step 2: Commit**

```bash
git add docs/BUSINESS_RULES.md && git commit -m "docs: add business rules for agent context"
```

---

### Task 15: PostHog SDK Setup

**Files:**
- Create: `lib/posthog.ts`
- Create: `components/posthog-provider.tsx`
- Modify: `app/layout.tsx`

**Step 1: Create PostHog client**

```ts
// lib/posthog.ts
import posthog from 'posthog-js'

export function initPostHog() {
  if (typeof window === 'undefined') return
  if (posthog.__loaded) return

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY || '', {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
  })
}

export { posthog }
```

**Step 2: Create PostHog provider**

```tsx
// components/posthog-provider.tsx
'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { initPostHog, posthog } from '@/lib/posthog'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog()
  }, [])

  const pathname = usePathname()
  useEffect(() => {
    if (posthog.__loaded) {
      posthog.capture('$pageview', { path: pathname })
    }
  }, [pathname])

  return <>{children}</>
}
```

**Step 3: Wrap layout in PostHogProvider**

In `app/layout.tsx`, wrap children:

```tsx
<PostHogProvider>
  <Nav />
  <main>...</main>
  <RelayEngine />
</PostHogProvider>
```

**Step 4: Add `.env.local` with PostHog keys**

```bash
echo "NEXT_PUBLIC_POSTHOG_KEY=your_key_here" >> .env.local
echo "NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com" >> .env.local
echo "OPENAI_API_KEY=your_key_here" >> .env.local
```

**Step 5: Commit**

```bash
git add lib/posthog.ts components/posthog-provider.tsx && git commit -m "integration: add PostHog SDK with autocapture and pageview tracking"
```

---

### Task 16: Agent Tools

**Files:**
- Create: `lib/tools/posthog.ts`
- Create: `lib/tools/codebase.ts`
- Create: `lib/tools/business-rules.ts`

**Step 1: PostHog events tool**

```ts
// lib/tools/posthog.ts
// Fetches recent events for a user from PostHog API
// For hackathon: falls back to mock data if no API key

import { MOCK_TIMELINE_EVENTS } from '@/lib/mock-data'

export async function getUserEvents(sessionId: string) {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID

  if (!apiKey || !projectId) {
    // Fallback to mock data for demo
    return MOCK_TIMELINE_EVENTS
  }

  try {
    const res = await fetch(
      `https://us.posthog.com/api/projects/${projectId}/events?session_id=${sessionId}&limit=20`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    )
    const data = await res.json()
    return data.results?.map((e: Record<string, unknown>, i: number) => ({
      id: `evt-${i}`,
      event: e.event,
      description: `${e.event}: ${JSON.stringify(e.properties || {}).slice(0, 100)}`,
      timestamp: e.timestamp,
      isError: String(e.event).includes('error'),
    })) || MOCK_TIMELINE_EVENTS
  } catch {
    return MOCK_TIMELINE_EVENTS
  }
}
```

**Step 2: Codebase reader tool**

```ts
// lib/tools/codebase.ts
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const PROJECT_ROOT = process.cwd()

// Whitelist of directories the agent can read
const ALLOWED_DIRS = ['app', 'components', 'lib', 'docs']

export function readSourceFile(filePath: string): string {
  // Security: only allow reading within project and allowed dirs
  const normalized = filePath.replace(/^\/+/, '')
  const isAllowed = ALLOWED_DIRS.some(dir => normalized.startsWith(dir))
  if (!isAllowed) {
    return `Error: Access denied. Can only read files in: ${ALLOWED_DIRS.join(', ')}`
  }

  const fullPath = join(PROJECT_ROOT, normalized)
  if (!existsSync(fullPath)) {
    return `Error: File not found: ${normalized}`
  }

  try {
    const content = readFileSync(fullPath, 'utf-8')
    // Truncate very long files
    if (content.length > 5000) {
      return content.slice(0, 5000) + '\n\n... (truncated)'
    }
    return content
  } catch {
    return `Error: Could not read file: ${normalized}`
  }
}
```

**Step 3: Business rules search tool**

```ts
// lib/tools/business-rules.ts
import { readFileSync } from 'fs'
import { join } from 'path'

const BUSINESS_RULES_PATH = join(process.cwd(), 'docs', 'BUSINESS_RULES.md')

export function searchBusinessRules(query: string): string {
  try {
    const content = readFileSync(BUSINESS_RULES_PATH, 'utf-8')
    const queryLower = query.toLowerCase()
    const sections = content.split('## ').filter(Boolean)

    const relevant = sections.filter(section =>
      section.toLowerCase().includes(queryLower)
    )

    if (relevant.length === 0) {
      return `No business rules found matching "${query}". Full document:\n\n${content}`
    }

    return relevant.map(s => `## ${s}`).join('\n\n')
  } catch {
    return 'Error: Could not read business rules document'
  }
}
```

**Step 4: Commit**

```bash
git add lib/tools/ && git commit -m "agent: add PostHog, codebase reader, and business rules search tools"
```

---

### Task 17: Agent API Route

**Files:**
- Create: `app/api/chat/route.ts`

The main agent. Uses Vercel AI SDK `streamText` with tools.

**Step 1: Build the agent route**

```ts
// app/api/chat/route.ts
import { openai } from '@ai-sdk/openai'
import { streamText, tool } from 'ai'
import { z } from 'zod'
import { getUserEvents } from '@/lib/tools/posthog'
import { readSourceFile } from '@/lib/tools/codebase'
import { searchBusinessRules } from '@/lib/tools/business-rules'

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages, elementContext, autoTriggered, errorMessage } = await req.json()

  const systemPrompt = `You are Relay Engine — an empathetic AI customer support agent embedded inside a web application called OrderFlow (an order management system).

Your personality:
- Lead with empathy: "That must be frustrating" before investigating
- Use the user's language, NEVER engineer jargon
- No "500 error" or "API returned 422" — instead "The order update didn't save properly"
- Ask about intent and goals, not just symptoms
- Warm but not sycophantic. Professional but human.
- When you can help the user succeed right now, do it.

Your capabilities — you have tools to:
1. Pull the user's recent session events (what they clicked, where they navigated)
2. Read the application's source code to investigate issues
3. Search business rules documentation to check if behavior is intentional

Your process:
1. First, use your tools to investigate. Pull events, read relevant code, check business rules.
2. Then ask the user 1-2 targeted clarifying questions based on what you found.
3. Finally, classify the issue and deliver your verdict using the classifyIssue tool.

Classification types:
- "bug": Genuine software defect that needs fixing
- "edge_case": Scenario the developers didn't handle (race condition, missing validation, etc.)
- "ux_issue": The software works as designed but the design is confusing or misleading

${elementContext ? `The user clicked on this element: ${elementContext.elementName} (CSS: ${elementContext.cssSelector}). Visible text: "${elementContext.visibleText}"` : ''}
${autoTriggered ? `The system detected an error automatically: "${errorMessage}". The user didn't manually report this — you proactively reached out. Start with empathy about the error.` : ''}
${errorMessage ? `Recent error message shown to user: "${errorMessage}"` : ''}

IMPORTANT: Always use your tools BEFORE asking the user questions. Investigate first, ask informed questions second. Always end with classifyIssue.`

  const result = streamText({
    model: openai('gpt-4o'),
    system: systemPrompt,
    messages,
    tools: {
      getUserEvents: tool({
        description: 'Get the recent events/actions this user took in the current session. Returns a timeline of pageviews, clicks, errors, and form submissions.',
        parameters: z.object({
          reason: z.string().describe('Why you are pulling events — what are you looking for?'),
        }),
        execute: async ({ reason }) => {
          const events = await getUserEvents('current-session')
          return { reason, events }
        },
      }),
      readSourceFile: tool({
        description: 'Read a source code file from the application codebase. Use this to investigate the implementation of features the user is reporting about. Available directories: app/, components/, lib/, docs/',
        parameters: z.object({
          filePath: z.string().describe('Path relative to project root, e.g. "app/api/orders/[id]/status/route.ts"'),
          reason: z.string().describe('Why you are reading this file'),
        }),
        execute: async ({ filePath, reason }) => {
          const content = readSourceFile(filePath)
          return { filePath, reason, content }
        },
      }),
      searchBusinessRules: tool({
        description: 'Search the business rules documentation to check if a reported behavior is intentional or a known limitation. Search with keywords like "status", "inventory", "checkout", etc.',
        parameters: z.object({
          query: z.string().describe('Search query — keywords about the behavior to check'),
        }),
        execute: async ({ query }) => {
          const results = searchBusinessRules(query)
          return { query, results }
        },
      }),
      classifyIssue: tool({
        description: 'Deliver your final classification of the issue. Use this AFTER you have investigated with tools and asked clarifying questions. This will generate a structured report visible to the user and saved for the engineering team.',
        parameters: z.object({
          type: z.enum(['bug', 'edge_case', 'ux_issue']).describe('The classification'),
          title: z.string().describe('Short title for the report (max 60 chars)'),
          summary: z.string().describe('One-paragraph summary of the issue and your finding'),
          evidence: z.string().describe('Key evidence: what code/rules/events informed your classification'),
        }),
        execute: async (classification) => {
          // TODO: Save to reports store
          return classification
        },
      }),
    },
    maxSteps: 5,
  })

  return result.toDataStreamResponse()
}
```

**Step 2: Verify — chat streams responses and calls tools**

1. Open the app, trigger report mode, click an element
2. Type "This is broken" → AI should call tools then respond conversationally
3. Check browser network tab: /api/chat should stream response

**Step 3: Commit**

```bash
git add app/api/chat/route.ts && git commit -m "agent: streaming chat route with tool calling (PostHog, codebase, business rules, classification)"
```

---

### Task 18: In-Memory Report Store

**Files:**
- Create: `lib/store.ts`
- Create: `app/api/reports/route.ts`

**Step 1: Build in-memory store**

```ts
// lib/store.ts
import { Report } from './types'

// In-memory store — resets on server restart. Fine for hackathon.
const reports: Report[] = []

export function addReport(report: Omit<Report, 'id' | 'createdAt'>): Report {
  const newReport: Report = {
    ...report,
    id: `RPT-${Date.now().toString().slice(-6)}`,
    createdAt: new Date().toISOString(),
  }
  reports.push(newReport)
  return newReport
}

export function getReports(): Report[] {
  return [...reports].reverse()
}
```

**Step 2: Build reports API**

```ts
// app/api/reports/route.ts
import { NextResponse } from 'next/server'
import { getReports } from '@/lib/store'

export async function GET() {
  return NextResponse.json(getReports())
}
```

**Step 3: Update classifyIssue tool in `/api/chat/route.ts` to save reports**

Add `import { addReport } from '@/lib/store'` and in the execute function:

```ts
execute: async (classification) => {
  addReport({
    type: classification.type,
    title: classification.title,
    summary: classification.summary,
    evidence: classification.evidence,
    userQuote: '',
    elementContext: JSON.stringify(elementContext || {}),
    conversationLog: messages,
    eventTimeline: [],
  })
  return classification
},
```

**Step 4: Commit**

```bash
git add lib/store.ts app/api/reports/route.ts && git commit -m "store: in-memory report storage with API endpoint"
```

---

### Task 19: Engineer Dashboard

**Files:**
- Create: `app/reports/page.tsx`

**Step 1: Build the dashboard**

```tsx
// app/reports/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { Report } from '@/lib/types'
import { motion, AnimatePresence } from 'framer-motion'

const TYPE_CONFIG = {
  bug: { label: 'Bug', emoji: '🐛', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
  edge_case: { label: 'Edge Case', emoji: '🔍', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  ux_issue: { label: 'UX Issue', emoji: '🎯', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/reports').then(r => r.json()).then(setReports)
    // Poll every 5s for new reports during demo
    const interval = setInterval(() => {
      fetch('/api/reports').then(r => r.json()).then(setReports)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Issues classified by Relay Engine — {reports.length} report{reports.length !== 1 ? 's' : ''}
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-lg border border-border-subtle bg-bg-subtle py-16 text-center">
          <p className="text-text-tertiary">No reports yet. Trigger the Relay Engine to see reports appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const config = TYPE_CONFIG[report.type]
            const isExpanded = expanded === report.id
            return (
              <motion.div
                key={report.id}
                layout
                className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm"
              >
                <button
                  onClick={() => setExpanded(isExpanded ? null : report.id)}
                  className="flex w-full items-start gap-4 px-5 py-4 text-left"
                >
                  <span className={`mt-0.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.border} ${config.text}`}>
                    {config.emoji} {config.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-sm font-semibold">{report.title}</h3>
                    <p className="mt-0.5 text-xs text-text-secondary line-clamp-1">{report.summary}</p>
                  </div>
                  <span className="flex-shrink-0 font-mono text-[10px] text-text-tertiary">
                    {new Date(report.createdAt).toLocaleTimeString()}
                  </span>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border-subtle"
                    >
                      <div className="px-5 py-4 space-y-4">
                        <div>
                          <h4 className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary mb-1">Summary</h4>
                          <p className="text-sm text-text-secondary leading-relaxed">{report.summary}</p>
                        </div>
                        <div>
                          <h4 className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary mb-1">Evidence</h4>
                          <p className="text-sm text-text-secondary leading-relaxed">{report.evidence}</p>
                        </div>
                        {report.elementContext && (
                          <div>
                            <h4 className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary mb-1">Element</h4>
                            <code className="text-xs font-mono text-text-secondary bg-bg-subtle px-2 py-1 rounded">{report.elementContext}</code>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Add Reports to navigation**

In `components/nav.tsx`, add to NAV_ITEMS:

```ts
{ href: '/reports', label: 'Reports' },
```

**Step 3: Commit**

```bash
git add app/reports/page.tsx && git commit -m "page: engineer dashboard with expandable report cards"
```

---

### Task 20: Polish Pass + Deploy

**Step 1: Add custom events to demo flows**

In the order detail and checkout pages, dispatch PostHog events for key actions:

```ts
import { posthog } from '@/lib/posthog'

// In order detail, on status change attempt:
posthog.capture('order_status_change_attempted', {
  orderId: id,
  fromStatus: status,
  toStatus: newStatus,
})

// In checkout, on submit:
posthog.capture('checkout_submitted', {
  itemCount: cartItems.length,
  total,
})
```

**Step 2: Test complete flows end-to-end**

1. Manual report flow: orders → click status → error → bubble → report mode → click element → chat → AI investigates → classification
2. Auto-trigger flow: checkout → add out-of-stock item → submit → error → bubble auto-triggers → chat → classification
3. Dashboard: check /reports shows both reports

**Step 3: Deploy to Vercel**

```bash
npx vercel --prod
```

Set environment variables in Vercel dashboard:
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `POSTHOG_PERSONAL_API_KEY`
- `POSTHOG_PROJECT_ID`

**Step 4: Final commit**

```bash
git add -A && git commit -m "polish: custom PostHog events, end-to-end flow verification"
```

---

## Task Summary

| # | Task | Phase | Est. |
|---|------|-------|------|
| 1 | Scaffold Next.js | Today | 5 min |
| 2 | Design system | Today | 10 min |
| 3 | Mock data + types | Today | 5 min |
| 4 | App layout + nav | Today | 5 min |
| 5 | Orders list page | Today | 5 min |
| 6 | Order detail (broken flow) | Today | 10 min |
| 7 | Checkout (broken flow) | Today | 10 min |
| 8 | Floating bubble | Today | 5 min |
| 9 | Event timeline | Today | 5 min |
| 10 | Classification card | Today | 5 min |
| 11 | Chat panel | Today | 10 min |
| 12 | Element selector | Today | 10 min |
| 13 | RelayEngine wrapper | Today | 10 min |
| 14 | Business rules doc | Tomorrow | 5 min |
| 15 | PostHog SDK setup | Tomorrow | 10 min |
| 16 | Agent tools | Tomorrow | 15 min |
| 17 | Agent API route | Tomorrow | 15 min |
| 18 | Report store | Tomorrow | 5 min |
| 19 | Engineer dashboard | Tomorrow | 10 min |
| 20 | Polish + deploy | Tomorrow | 15 min |
