# FDE Action Approval — Frontend Design

## Context

The AI FDE (Railway) is the brain — it investigates issues, has codebase context, and decides what tool calls to make. The local Vercel app has Postgres-backed API routes that execute real data operations.

When the FDE decides an action is needed (update order status, checkout, etc.), it emits a `require-action` SSE event. The frontend renders an approval card, and on user approval, calls the local API route and sends the result back to the FDE.

## Architecture

```
User → chat → FDE (investigates, decides actions)
                ↓
        require-action SSE event
                ↓
    Frontend renders approval card
                ↓
        User approves/denies
                ↓
    Frontend calls local API route (Postgres)
                ↓
    Result appended to conversation as tool result
                ↓
    Next FDE request includes tool result → FDE continues
```

## SSE Event Format

```json
{
  "type": "require-action",
  "toolCallId": "call_abc123",
  "toolName": "updateOrderStatus",
  "input": { "orderId": "ORD-001", "newStatus": "processing" }
}
```

## Tool → API Route Mapping

| Tool Name | Method | Route | Body |
|-----------|--------|-------|------|
| getOrders | GET | /api/orders | — |
| getOrder | GET | /api/orders/{orderId} | — |
| getProducts | GET | /api/products | — |
| updateOrderStatus | PATCH | /api/orders/{orderId}/status | { status } |
| checkout | POST | /api/checkout | { items, customerName?, customerEmail? } |

## Message Flow (Full Lifecycle)

1. User sends message → POST to FDE with messages
2. FDE calls OpenAI → OpenAI decides to call an action tool
3. FDE emits: text-delta, tool-input-available, **require-action**, finish
4. Frontend renders approval card in chat
5. User clicks Approve
6. Frontend calls local API route with args
7. Frontend appends tool result to conversation history:
   - Assistant message with tool_call
   - Tool result message: `{role: "tool", tool_call_id: "...", content: JSON}`
8. Frontend sends next request to FDE with updated messages
9. FDE agent loop continues with the result → responds naturally

On deny: append `{denied: true, reason: "User declined"}` as tool result.

## Scope (Frontend Only)

FDE Python changes (server/) are out of scope — handled separately.

### Create
- `components/relay-engine/action-card.tsx` — Approval card (action description, Approve/Deny buttons). Styled consistently with ClassificationCard.

### Modify
- `components/relay-engine/chat-panel.tsx` — Revert transport to FDE URL. Parse `require-action` events from SSE stream. Render ActionCard. On approve, call local API. On deny, append denial result. Send tool result in next FDE request.

### Delete
- `app/api/chat/route.ts` — No longer needed.
