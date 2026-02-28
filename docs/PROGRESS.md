# Relay Engine — Current Progress

## The idea

Non-technical users report bugs and request features with massive context loss. By the time it reaches eng, it's been telephone-gamed through Slack and tickets. The user may not even remember what led to the issue.

**Relay Engine** is a floating AI agent inside any web app. User hits a problem, the agent already knows what they did (PostHog events), can read the source code and business rules, asks clarifying questions, then classifies the issue as Bug / Edge Case / UX Issue. Zero information loss, zero eng back-and-forth.

Think: an agentic 24/7 CSM that genuinely understands the technical side.

## Things we can lean into

These are the angles I've been thinking about so far — open to riffing on all of these:

**1. Direct component interaction (not just a chatbot)**
User clicks directly on the element that failed — chatbot opens *right there*, already knowing what they clicked. Element-level interaction, not a generic chat widget.

**2. Context-aware investigation**
The agent already knows the codebase, the business rules, and the user's current state. It asks *smart follow-ups* on top of existing context. Conversation starts at step 3, not step 0.

**3. Session replay via PostHog**
Full event timeline before the user says anything — every page visit, click, API error. Agent synthesizes the sequence to determine whether it's actually a bug or expected behavior.

**4. Empathetic CSM, not a fact-finder**
Not a triage bot. "Your order is safe." "You haven't been charged." "You won't have to explain this again." The warmth is a deliberate product decision — non-technical users get assurance, not just classification.

**5. Engineer dashboard (the payoff)**
Everything the agent gathered — PostHog timeline, source code references, business rule checks, user conversation, final classification — lands as a structured report. Zero information loss from user to eng.

## What I've built so far

The full frontend is done — a fake e-commerce store ("HONE") with two intentionally broken flows, and the widget UI (glassmorphic chat panel, animations, element selection). Everything builds and runs.

No backend agent logic exists yet.

## Stack

Next.js 16 (App Router) / Tailwind v4 (`@theme inline`, not config file) / Vercel AI SDK v6 (`@ai-sdk/react` + `ai`) / OpenAI GPT-4o / PostHog / Framer Motion / Zod

## Architecture

```
Store (HONE)                    Widget (Relay Engine)              Agent API
─────────────                   ──────────────────────             ──────────
/ (shop + cart drawer)          Floating bubble                    POST /api/chat
/orders, /orders/[id]           Element selector overlay           streamText + tools
Two broken flows                Glassmorphic chat panel            ├─ getUserEvents (PostHog)
Dispatch CustomEvents
on errors                       ├─ useChat hook → /api/chat       ├─ readSourceFile (codebase)
                                ├─ Event timeline (animated)       ├─ searchBusinessRules (MD)
                                └─ Classification card (verdict)   └─ classifyIssue (saves report)
                                                                   maxSteps: 5
```

## The two demo flows

**Flow 1 — UX Issue:** `/orders/ORD-001` (status: pending). User clicks "Request Shipping" — API rejects pending→shipped with `ERR_INVALID_TRANSITION`. Agent reads code + business rules → classifies as UX Issue.

**Flow 2 — Edge Case:** `/` (home page). "Desk Mat" has 0 stock but "Add to Cart" button is enabled. User adds to cart, opens drawer, clicks Checkout → fails with `STOCK_INSUFFICIENT`. Agent classifies as Edge Case (race condition, no cart reservation).

Both flows dispatch `CustomEvent('relay-engine:error')` — the widget auto-triggers on these.

## What's still pending

The backend/agent layer. Here's what I've scoped out so far — happy to discuss how we want to tackle it:

| What | Files | Notes |
|------|-------|-------|
| Business rules doc | `docs/BUSINESS_RULES.md` | Agent reads this to check if behavior is intentional |
| PostHog integration | `lib/posthog.ts`, `components/posthog-provider.tsx` | SDK init + provider. Falls back to mock data if no API key |
| Agent tools | `lib/tools/{posthog,codebase,business-rules}.ts` | `getUserEvents()`, `readSourceFile()`, `searchBusinessRules()` |
| **Agent API route** | `app/api/chat/route.ts` | `streamText()` with OpenAI + tools + `maxSteps: 5` |
| Report store | `lib/store.ts`, `app/api/reports/route.ts` | In-memory. `classifyIssue` tool saves here |
| Dashboard | `app/reports/page.tsx` | Report cards with classification, expandable details |
| Deploy | Vercel | Env vars: `OPENAI_API_KEY`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` |

## How the frontend connects to the agent

The chat panel uses `useChat` from `@ai-sdk/react`. It POSTs to `/api/chat` with `{ messages, elementContext, autoTriggered, errorMessage }` in the body.

The chat panel parses tool invocations — looks for `classifyIssue` results and renders a `ClassificationCard` with the verdict. Uses Vercel AI SDK v6 patterns (`part.type === 'dynamic-tool'`, `part.state === 'output-available'`).

## How to run

```bash
git clone git@github.com:iamgenechua/relay-engine.git
cd relay-engine
npm install
npm run dev
```

Try the broken flows: "Request Shipping" on `/orders/ORD-001`, or add Desk Mat to cart and checkout. Click the green bubble to enter report mode and click an element.

## Open questions

- PostHog: live events vs mock fallback (depends on whether we set up a project)
- System prompt tuning — there's a draft in the design doc but should iterate live
- How many tool calls / follow-up questions feel right for demo pacing
- Dashboard: how much polish vs time on the agent itself

## Reference docs

- `docs/plans/2026-02-27-relay-engine-design.md` — product design, agent personality, demo script
- `docs/plans/2026-02-27-relay-engine-implementation.md` — implementation plan with code samples for remaining tasks
