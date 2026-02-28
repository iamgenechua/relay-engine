# FDE Action Approval — Frontend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When the FDE emits a `require-action` SSE event, render an approval card in the chat. On approve, call the local Postgres-backed API and send the result back to the FDE.

**Architecture:** Chat stays routed to FDE on Railway. A new `ActionCard` component renders approval UI for action tool calls. The chat panel parses `require-action` events, dispatches local API calls on approval, and appends the tool result to conversation history for the next FDE request.

**Tech Stack:** React, Framer Motion, Vercel AI SDK (`useChat`, `DefaultChatTransport`), existing API routes.

---

### Task 1: Delete `/api/chat` route

This route tried to be an independent agent. The FDE is the brain — we don't need it.

**Files:**
- Delete: `app/api/chat/route.ts`

**Step 1: Delete the file**

```bash
rm app/api/chat/route.ts
```

**Step 2: Verify build**

Run: `npx next build`
Expected: Build succeeds (nothing imports this route)

**Step 3: Commit**

```bash
git add -A && git commit -m "chore: remove local /api/chat route — FDE is the brain"
```

---

### Task 2: Revert chat panel transport to FDE

The chat transport was changed from the FDE URL to `/api/chat`. Revert it.

**Files:**
- Modify: `components/relay-engine/chat-panel.tsx:225-236`

**Step 1: Change the transport API URL**

In `chat-panel.tsx`, change:

```ts
transport: new DefaultChatTransport({
  api: '/api/chat',
  body: {
```

To:

```ts
transport: new DefaultChatTransport({
  api: `${process.env.NEXT_PUBLIC_FDE_URL || 'http://localhost:8000'}/api/fde/stream`,
  body: {
```

**Step 2: Verify build**

Run: `npx next build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add components/relay-engine/chat-panel.tsx
git commit -m "fix: revert chat transport to FDE backend"
```

---

### Task 3: Create ActionCard component

A card that shows what action the FDE wants to take, with Approve/Deny buttons. Styled like `ClassificationCard` — glassmorphic, animated, fits the chat panel.

**Files:**
- Create: `components/relay-engine/action-card.tsx`

**Step 1: Create the component**

```tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface ActionCardProps {
  toolName: string
  toolCallId: string
  input: Record<string, unknown>
  onApprove: (toolCallId: string, toolName: string, input: Record<string, unknown>) => void
  onDeny: (toolCallId: string) => void
}

const ACTION_LABELS: Record<string, (input: Record<string, unknown>) => string> = {
  getOrders: () => 'Look up all orders',
  getOrder: (input) => `Look up order ${input.orderId}`,
  getProducts: () => 'Check product inventory',
  updateOrderStatus: (input) => `Update ${input.orderId} to "${input.newStatus}"`,
  checkout: (input) => {
    const items = input.items as { productId: string; quantity: number }[]
    return `Create order with ${items?.length ?? 0} item${items?.length === 1 ? '' : 's'}`
  },
}

export default function ActionCard({
  toolName,
  toolCallId,
  input,
  onApprove,
  onDeny,
}: ActionCardProps) {
  const [status, setStatus] = useState<'pending' | 'approved' | 'denied' | 'executing'>('pending')

  const labelFn = ACTION_LABELS[toolName]
  const description = labelFn ? labelFn(input) : `Run ${toolName}`

  const handleApprove = () => {
    setStatus('executing')
    onApprove(toolCallId, toolName, input)
  }

  const handleDeny = () => {
    setStatus('denied')
    onDeny(toolCallId)
  }

  return (
    <motion.div
      initial={{ scale: 0.8, y: 20, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 24,
        mass: 0.8,
      }}
      style={{
        background: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 14,
        padding: 18,
      }}
    >
      {/* Action label */}
      <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
        <span
          style={{
            display: 'block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: 'var(--color-accent)',
          }}
        />
        <span
          className="font-body"
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--color-accent)',
            letterSpacing: '0.03em',
          }}
        >
          Action Required
        </span>
      </div>

      {/* Description */}
      <p
        className="font-body"
        style={{
          fontSize: 13,
          lineHeight: 1.625,
          color: 'var(--color-text)',
          margin: 0,
          marginBottom: 14,
        }}
      >
        {description}
      </p>

      {/* Buttons or status */}
      {status === 'pending' && (
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            className="font-body"
            style={{
              fontSize: 12,
              fontWeight: 500,
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--color-accent)',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'opacity 0.15s ease',
            }}
          >
            Approve
          </button>
          <button
            onClick={handleDeny}
            className="font-body"
            style={{
              fontSize: 12,
              fontWeight: 500,
              padding: '6px 14px',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Deny
          </button>
        </div>
      )}

      {status === 'executing' && (
        <span className="font-body" style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
          Executing...
        </span>
      )}

      {status === 'denied' && (
        <span className="font-body" style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
          Declined by user.
        </span>
      )}
    </motion.div>
  )
}
```

**Step 2: Verify build**

Run: `npx next build`
Expected: Build succeeds (component not imported yet, but should compile)

**Step 3: Commit**

```bash
git add components/relay-engine/action-card.tsx
git commit -m "feat: add ActionCard component for FDE action approval"
```

---

### Task 4: Add action execution logic to chat panel

Wire up the chat panel to: parse `require-action` events from messages, render `ActionCard`, execute the local API on approval, and send the tool result back to the FDE.

**Files:**
- Modify: `components/relay-engine/chat-panel.tsx`

**Step 1: Add imports and types**

At the top of `chat-panel.tsx`, add the import:

```ts
import ActionCard from '@/components/relay-engine/action-card'
```

Add a type and state for pending actions after the `posStyle` state:

```ts
interface PendingAction {
  toolCallId: string
  toolName: string
  input: Record<string, unknown>
}

// inside the component, after posStyle state:
const [pendingActions, setPendingActions] = useState<PendingAction[]>([])
```

**Step 2: Add `parseActions` function**

After the existing `parseClassification` function, add:

```ts
function parseActions(messages: any[]): PendingAction[] {
  const actions: PendingAction[] = []
  for (const msg of messages) {
    if (msg.role === 'assistant' && msg.parts) {
      for (const part of msg.parts as any[]) {
        if (
          part.type === 'dynamic-tool' &&
          part.state === 'output-available' &&
          part.output?.type === 'require-action'
        ) {
          actions.push({
            toolCallId: part.output.toolCallId,
            toolName: part.output.toolName,
            input: part.output.input,
          })
        }
      }
    }
  }
  return actions
}
```

**Step 3: Add `executeAction` helper**

Add this function inside the component (after `handleSubmit`):

```ts
const TOOL_ROUTES: Record<string, (input: Record<string, unknown>) => { method: string; url: string; body?: unknown }> = {
  getOrders: () => ({ method: 'GET', url: '/api/orders' }),
  getOrder: (input) => ({ method: 'GET', url: `/api/orders/${input.orderId}` }),
  getProducts: () => ({ method: 'GET', url: '/api/products' }),
  updateOrderStatus: (input) => ({
    method: 'PATCH',
    url: `/api/orders/${input.orderId}/status`,
    body: { status: input.newStatus },
  }),
  checkout: (input) => ({
    method: 'POST',
    url: '/api/checkout',
    body: { items: input.items, customerName: input.customerName, customerEmail: input.customerEmail },
  }),
}

async function handleActionApprove(toolCallId: string, toolName: string, input: Record<string, unknown>) {
  const routeFn = TOOL_ROUTES[toolName]
  if (!routeFn) {
    console.error('[relay] Unknown tool:', toolName)
    return
  }

  const { method, url, body } = routeFn(input)

  try {
    const res = await fetch(url, {
      method,
      ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    })
    const result = await res.json()

    // Send the tool result back to FDE as the next message
    sendMessage({
      text: JSON.stringify({
        type: 'tool-result',
        toolCallId,
        toolName,
        result,
      }),
    })
  } catch (err) {
    console.error('[relay] Action execution failed:', err)
    sendMessage({
      text: JSON.stringify({
        type: 'tool-result',
        toolCallId,
        toolName,
        result: { error: 'Action execution failed' },
      }),
    })
  } finally {
    setPendingActions((prev) => prev.filter((a) => a.toolCallId !== toolCallId))
  }
}

function handleActionDeny(toolCallId: string) {
  sendMessage({
    text: JSON.stringify({
      type: 'tool-result',
      toolCallId,
      result: { denied: true, reason: 'User declined' },
    }),
  })
  setPendingActions((prev) => prev.filter((a) => a.toolCallId !== toolCallId))
}
```

**Step 4: Sync pending actions from messages**

Add a useEffect to detect new actions from messages:

```ts
useEffect(() => {
  const actions = parseActions(messages)
  if (actions.length > 0) {
    setPendingActions(actions)
  }
}, [messages])
```

**Step 5: Render ActionCards in the messages area**

After the classification card block (`{classification && ...}`), add:

```tsx
{/* Action approval cards */}
{pendingActions.map((action) => (
  <div key={action.toolCallId} style={{ padding: '4px 0' }}>
    <ActionCard
      toolName={action.toolName}
      toolCallId={action.toolCallId}
      input={action.input}
      onApprove={handleActionApprove}
      onDeny={handleActionDeny}
    />
  </div>
))}
```

**Step 6: Verify build**

Run: `npx next build`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add components/relay-engine/chat-panel.tsx
git commit -m "feat: wire up FDE action approval flow in chat panel"
```

---

### Task 5: Verify end-to-end build

**Step 1: Full build check**

Run: `npx next build`
Expected: Build succeeds with no TypeScript errors

**Step 2: Verify API routes still work**

Run:
```bash
curl -s http://localhost:3000/api/products | python3 -m json.tool
curl -s http://localhost:3000/api/orders | python3 -m json.tool
```
Expected: JSON responses with products/orders from Postgres

**Step 3: Commit all remaining changes**

```bash
git add -A && git commit -m "chore: verify FDE action approval integration"
```
