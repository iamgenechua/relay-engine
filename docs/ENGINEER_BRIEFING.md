# Engineer Briefing — Relay Engine

Read time: 5 minutes. This gets you up to speed on what we're building, what's done, what you need to build, and how the codebase works.

---

## What is this?

**Relay Engine** is a floating AI support agent that lives inside any web app. When a user hits a problem, the agent:

1. Knows what the user did (pulls their event history from PostHog)
2. Investigates the codebase (reads source code + business rules docs)
3. Asks smart follow-up questions (conversational, empathetic, not robotic)
4. Classifies the issue as **Bug**, **Edge Case**, or **UX Issue**
5. Delivers a structured report to engineers with zero information loss

We're demoing this at an **OpenAI hackathon**. The demo app is a fake e-commerce store called "HONE" with two intentionally broken flows. The Relay Engine widget is the product we're showing off.

## The demo flow (3 min pitch)

1. User browses HONE store, tries to update an order status, gets a cryptic error
2. The support widget bubble pulses — user clicks it, enters "report mode"
3. User clicks on the broken element — a **glassmorphic chat panel appears anchored to that element**
4. An animated timeline shows what the user just did (PostHog events)
5. The AI agent investigates: pulls events, reads the source code, checks business rules
6. AI asks 1-2 clarifying questions, then delivers a verdict: "UX Issue — the UI shows invalid status transitions"
7. Second demo: user tries checkout with out-of-stock item, widget auto-triggers on error
8. Engineer dashboard shows both reports with full context

## Tech stack

- **Next.js 16** (App Router, Turbopack)
- **Tailwind CSS v4** (design tokens via `@theme inline` in `globals.css`, NOT `tailwind.config.ts`)
- **Vercel AI SDK v6** (`@ai-sdk/react` for `useChat`, `ai` for `streamText` + tools)
- **OpenAI GPT-4o** (for the agent)
- **PostHog** (event tracking + REST API for event retrieval)
- **Framer Motion** (animations)
- **Zod** (tool parameter validation)

## What's built (you don't need to touch these)

### The store ("HONE")

| Route | File | What |
|-------|------|------|
| `/` | `app/page.tsx` | Landing page |
| `/orders` | `app/orders/page.tsx` | My Orders list |
| `/orders/[id]` | `app/orders/[id]/page.tsx` | Order detail — **has broken status flow** |
| `/cart` | `app/cart/page.tsx` | Shop + cart — **has broken inventory flow** |
| `/api/orders/[id]/status` | `app/api/orders/[id]/status/route.ts` | PATCH — rejects invalid status transitions |
| `/api/checkout` | `app/api/checkout/route.ts` | POST — rejects out-of-stock items |

**Broken Flow 1 (UX Issue):** Order ORD-001 is "pending". UI shows ALL status options including "shipped". API rejects pending->shipped with cryptic `ERR_INVALID_TRANSITION` error.

**Broken Flow 2 (Edge Case):** Product "Desk Mat" (prod-5) has 0 stock but UI shows "Out of stock" (previously showed "Limited" — either way, user can still try to check out). API rejects with `CHECKOUT_FAILED: STOCK_INSUFFICIENT`.

Both broken flows dispatch `window.dispatchEvent(new CustomEvent('relay-engine:error', { detail: { message } }))` which the widget listens for.

### The widget (Relay Engine)

| Component | File | What |
|-----------|------|------|
| Wrapper | `components/relay-engine/relay-engine.tsx` | State machine: idle -> report -> chat. Listens for error events. |
| Bubble | `components/relay-engine/floating-bubble.tsx` | 44px circle, bottom-right. Breathing pulse. Turns red on error. |
| Element Selector | `components/relay-engine/element-selector.tsx` | Report mode overlay. Crosshair cursor. Hover highlight. Click to select. |
| Chat Panel | `components/relay-engine/chat-panel.tsx` | **Glassmorphic panel anchored to clicked element.** Uses `useChat` from `@ai-sdk/react`. |
| Event Timeline | `components/relay-engine/event-timeline.tsx` | Animated step-by-step timeline. Staggered entrance. Error dots pulse red. |
| Classification Card | `components/relay-engine/classification-card.tsx` | Verdict reveal card. Spring animation. Bug/Edge Case/UX Issue. |

**State flow:**
```
idle -> [click bubble] -> report mode -> [click element] -> chat (panel anchored to element)
idle -> [error event fires] -> bubble turns red -> [1.5s delay] -> chat auto-opens
```

**Chat panel positioning:** `computePosition(boundingBox)` tries below the element, then above, then to the right, then falls back to bottom-right corner. Viewport-clamped.

### Data

| File | What |
|------|------|
| `lib/types.ts` | TypeScript types for Order, OrderStatus, Report, TimelineEvent, etc. |
| `lib/mock-data.ts` | 4 mock orders, 6 mock products, valid status transitions map, mock timeline events |

---

## What you need to build

### 1. `docs/BUSINESS_RULES.md` (5 min)

The AI agent reads this file to determine if reported behavior is intentional. Write it documenting:
- Valid order status transitions (pending->processing->shipped->delivered)
- Inventory rules (stock checked at checkout time, no cart reservations)
- Known UX gaps (UI shows invalid transitions, "Out of stock" labeling)

### 2. PostHog SDK setup (10 min)

**Create:**
- `lib/posthog.ts` — PostHog client init (`posthog.init()` with project key)
- `components/posthog-provider.tsx` — Provider component, captures pageviews on route change

**Modify:**
- `app/layout.tsx` — Wrap in PostHogProvider

**Add custom events** to the broken flows:
- Order detail: `posthog.capture('order_status_change_attempted', { orderId, fromStatus, toStatus })`
- Cart: `posthog.capture('checkout_submitted', { itemCount, total })`

**Env vars needed:** `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`

### 3. Agent tools (15 min)

**Create `lib/tools/`:**

**`posthog.ts`** — `getUserEvents(sessionId)`: Call PostHog REST API (`/api/event/`) to get recent events for the session. Falls back to `MOCK_TIMELINE_EVENTS` if no API key.

**`codebase.ts`** — `readSourceFile(filePath)`: Reads files from the project. Whitelist: `app/`, `components/`, `lib/`, `docs/`. Security: prevent path traversal.

**`business-rules.ts`** — `searchBusinessRules(query)`: Reads `docs/BUSINESS_RULES.md`, searches for sections matching the query.

### 4. Agent API route — THE MAIN EVENT (15 min)

**Create: `app/api/chat/route.ts`**

This is the brain. Uses Vercel AI SDK v6:

```ts
import { openai } from '@ai-sdk/openai'
import { streamText, tool } from 'ai'
import { z } from 'zod'

export async function POST(req: Request) {
  const { messages, elementContext, autoTriggered, errorMessage } = await req.json()

  const result = streamText({
    model: openai('gpt-4o'),
    system: `[empathetic support agent prompt — see design doc]`,
    messages,
    tools: {
      getUserEvents: tool({ ... }),      // PostHog
      readSourceFile: tool({ ... }),     // Codebase
      searchBusinessRules: tool({ ... }),// MD docs
      classifyIssue: tool({ ... }),      // Final verdict — saves to report store
    },
    maxSteps: 5,  // Agent chains up to 5 tool calls autonomously
  })

  return result.toDataStreamResponse()
}
```

**Key:** The `classifyIssue` tool is how the agent delivers its verdict. The chat panel parses tool invocation results from messages to detect when classification happens and renders the ClassificationCard.

**Env vars needed:** `OPENAI_API_KEY`

### 5. Report store (5 min)

**Create:**
- `lib/store.ts` — In-memory array of Reports. `addReport()` and `getReports()`.
- `app/api/reports/route.ts` — GET endpoint returning all reports.

The `classifyIssue` tool's execute function calls `addReport()` to save.

### 6. Engineer dashboard (10 min)

**Create: `app/reports/page.tsx`**

Grid of report cards. Each card shows: classification dot + label, title, timestamp, summary. Click to expand: full evidence, element context. Polls `/api/reports` every 5s during demo.

Add "Reports" link to `components/nav.tsx`.

### 7. Polish + deploy (15 min)

- Test both demo flows end-to-end
- Deploy to Vercel: `npx vercel --prod`
- Set env vars in Vercel dashboard

---

## How to run

```bash
git clone git@github.com:iamgenechua/relay-engine.git
cd relay-engine
npm install
npm run dev
# Open http://localhost:3000
```

To test the broken flows:
1. Go to `/orders` -> click ORD-001 -> click "Shipped" -> see error
2. Go to `/cart` -> add "Desk Mat" -> click "Place Order" -> see error

The widget bubble is visible on every page. Click it to enter report mode.

---

## File tree (what matters)

```
relay-engine/
├── app/
│   ├── globals.css              <- Design tokens (@theme inline for Tailwind v4)
│   ├── layout.tsx               <- Root layout (fonts, nav, widget)
│   ├── page.tsx                 <- Store landing
│   ├── orders/
│   │   ├── page.tsx             <- My Orders list
│   │   └── [id]/page.tsx        <- Order detail (BROKEN FLOW 1)
│   ├── cart/page.tsx            <- Shop + cart (BROKEN FLOW 2)
│   ├── api/
│   │   ├── orders/[id]/status/route.ts  <- Status update API
│   │   ├── checkout/route.ts            <- Checkout API
│   │   ├── chat/route.ts               <- YOU BUILD THIS (agent)
│   │   └── reports/route.ts            <- YOU BUILD THIS (reports API)
│   └── reports/page.tsx                <- YOU BUILD THIS (dashboard)
├── components/
│   ├── nav.tsx                  <- Store navigation
│   └── relay-engine/
│       ├── relay-engine.tsx     <- Widget wrapper (state machine)
│       ├── floating-bubble.tsx  <- The bubble button
│       ├── element-selector.tsx <- Report mode overlay
│       ├── chat-panel.tsx       <- Glassmorphic chat (uses useChat)
│       ├── event-timeline.tsx   <- Animated step timeline
│       └── classification-card.tsx <- Verdict reveal card
├── lib/
│   ├── types.ts                 <- All TypeScript types
│   ├── mock-data.ts             <- Orders, products, transitions, events
│   ├── store.ts                 <- YOU BUILD THIS (in-memory reports)
│   ├── posthog.ts               <- YOU BUILD THIS (PostHog client)
│   └── tools/                   <- YOU BUILD THIS
│       ├── posthog.ts           <- Event retrieval tool
│       ├── codebase.ts          <- File reader tool
│       └── business-rules.ts    <- MD search tool
├── docs/
│   ├── BUSINESS_RULES.md        <- YOU BUILD THIS (agent reads this)
│   └── plans/
│       ├── 2026-02-27-relay-engine-design.md
│       └── 2026-02-27-relay-engine-implementation.md
└── package.json
```

---

## Decisions to revisit together

| # | Decision | Current default | Worth discussing? |
|---|----------|----------------|-------------------|
| 1 | Data storage | In-memory (resets on restart) | Fine for demo |
| 2 | Number of AI follow-ups | 2 before classify | Test during demo rehearsal |
| 3 | PostHog: live events vs mock | Falls back to mock if no API key | Depends on if we set up PostHog project |
| 4 | Dashboard polish level | Functional, minimal | Based on remaining time |
| 5 | Auto-trigger timing | 1.5s delay after error | May want faster/slower |
| 6 | System prompt tone | Empathetic CSM, never uses jargon | Read design doc for details |

---

## Key design docs (read if you have time)

- `docs/plans/2026-02-27-relay-engine-design.md` — Full product design, demo script, agent personality
- `docs/plans/2026-02-27-relay-engine-implementation.md` — Detailed implementation plan with code samples for every task
