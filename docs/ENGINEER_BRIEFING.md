# Relay Engine — Hackathon Briefing

## The idea

Non-technical users report bugs and request features with massive context loss. By the time it reaches eng, it's been telephone-gamed through Slack and tickets. The user may not even remember what led to the issue.

**Relay Engine** is a floating AI agent inside any web app. User hits a problem, the agent already knows what they did (PostHog events), can read the source code and business rules, asks clarifying questions, then classifies the issue as Bug / Edge Case / UX Issue. Zero information loss, zero eng back-and-forth.

Think: an agentic 24/7 CSM that genuinely understands the technical side.

## What's done

I prepped all the frontend — a fake e-commerce store ("HONE") with two intentionally broken flows, and the full widget UI with glassmorphic chat panel, animations, element selection. Everything builds and runs. **No backend agent logic exists yet — that's our work tomorrow.**

## Stack

Next.js 16 (App Router) / Tailwind v4 (`@theme inline`, not config file) / Vercel AI SDK v6 (`@ai-sdk/react` + `ai`) / OpenAI GPT-4o / PostHog / Framer Motion / Zod

## Architecture

```
Store (HONE)                    Widget (Relay Engine)              Agent API
─────────────                   ──────────────────────             ──────────
/orders, /cart                  Floating bubble                    POST /api/chat
Two broken flows                Element selector overlay           streamText + tools
Dispatch CustomEvents           Glassmorphic chat panel            ├─ getUserEvents (PostHog)
on errors                       ├─ useChat hook → /api/chat       ├─ readSourceFile (codebase)
                                ├─ Event timeline (animated)       ├─ searchBusinessRules (MD)
                                └─ Classification card (verdict)   └─ classifyIssue (saves report)
                                                                   maxSteps: 5
```

## The two demo flows

**Flow 1 — UX Issue:** `/orders/ORD-001` (status: pending). UI shows ALL status buttons including "Shipped". API rejects pending→shipped with `ERR_INVALID_TRANSITION`. The agent should read the code + business rules and classify as UX Issue (UI shouldn't offer invalid transitions).

**Flow 2 — Edge Case:** `/cart`. "Desk Mat" has 0 stock but UI lets you add to cart. Checkout fails with `STOCK_INSUFFICIENT`. The agent should classify as Edge Case (race condition, no cart reservation).

Both flows dispatch `CustomEvent('relay-engine:error')` — the widget auto-triggers on these.

## What we need to build together

The whole backend/agent layer. Here's the surface area:

| What | Files | Notes |
|------|-------|-------|
| Business rules doc | `docs/BUSINESS_RULES.md` | Agent reads this to check if behavior is intentional. Status transitions, inventory rules, known UX gaps. |
| PostHog integration | `lib/posthog.ts`, `components/posthog-provider.tsx` | SDK init + provider. Add custom events to broken flows. Falls back to mock data if no API key. |
| Agent tools | `lib/tools/{posthog,codebase,business-rules}.ts` | `getUserEvents()`, `readSourceFile()` (whitelisted dirs), `searchBusinessRules()` |
| **Agent API route** | `app/api/chat/route.ts` | `streamText()` with OpenAI + 4 tools + `maxSteps: 5`. System prompt: empathetic, investigates before asking, classifies at the end. |
| Report store | `lib/store.ts`, `app/api/reports/route.ts` | In-memory. `classifyIssue` tool saves here. |
| Dashboard | `app/reports/page.tsx` | Report cards with classification, expandable details. For judge deep-dive. |
| Deploy | Vercel | Env vars: `OPENAI_API_KEY`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` |

The critical path is the agent API route + tools. Everything else is straightforward.

## How the frontend connects to the agent

The chat panel uses `useChat` from `@ai-sdk/react`. It POSTs to `/api/chat` with `{ messages, elementContext, autoTriggered, errorMessage }` in the body.

The chat panel parses messages for tool invocations — specifically looking for `classifyIssue` tool results. When found, it renders a `ClassificationCard` component with the verdict. The parsing checks for `part.type === 'dynamic-tool'` and `part.toolName === 'classifyIssue'` with `part.state === 'output-available'` (Vercel AI SDK v6 patterns).

## How to run

```bash
git clone git@github.com:iamgenechua/relay-engine.git
cd relay-engine
npm install
npm run dev
```

Try the broken flows, click the green bubble, enter report mode, click an element.

## Open decisions

- PostHog: live events vs mock fallback (depends on whether we set up a project)
- System prompt tuning (the design doc has a draft but we should iterate on it live)
- How many tool calls / follow-up questions feel right for the demo pacing
- Dashboard: how much polish vs time spent on the agent itself

## Reference docs

- `docs/plans/2026-02-27-relay-engine-design.md` — product design, agent personality, demo script
- `docs/plans/2026-02-27-relay-engine-implementation.md` — full implementation plan with code samples for every remaining task
