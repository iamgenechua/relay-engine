# Relay Engine — Design Document

**Date**: 2026-02-27
**Context**: OpenAI Hackathon — build in 1 day, demo in 3 minutes
**Team**: Gene + YC engineer
**Stack**: Next.js 14 App Router, Tailwind CSS, Vercel AI SDK, OpenAI GPT-4o, PostHog

---

## Problem

When non-technical users encounter bugs or want to suggest features, critical context is lost:

- Users can't articulate technical issues clearly
- By the time feedback reaches engineers, it's been telephone-gamed through Slack, tickets, and meetings
- Engineers spend more time reproducing and understanding than fixing
- Users feel unheard — nobody's available when they hit the problem

## Product

**Relay Engine** is a floating AI agent embedded in any web app that:

1. Captures user feedback **in the moment** they encounter an issue
2. Autonomously investigates — pulls session events, reads source code, checks business rules
3. Asks smart follow-up questions to extract intent, not just symptoms
4. Classifies issues as **Bug**, **Edge Case**, or **UX Issue**
5. Can guide users to resolution in real-time when possible
6. Delivers structured, context-rich reports to engineers with zero information loss

**Core identity**: Not a debugging robot. A **24/7 customer success agent** that leads with empathy and happens to be technically capable. "You won't have to explain this again."

---

## Three Demo Moments

### 1. The Timeline (jaw-drop)
User clicks a broken element → chatbot opens → animated step-by-step visual replay of their recent actions appears. "It already knows what I did."

### 2. The Conversation (depth)
AI asks targeted follow-up questions — not generic "describe the issue" but "I see you tried to change the status to Shipped. Were you expecting to skip the Processing step?" Informed by PostHog events + codebase context.

### 3. The Classification (payoff)
AI synthesizes everything → delivers an animated verdict card: Bug / Edge Case / UX Issue — with evidence and a one-line summary. Engineers get a complete, structured report.

**Bonus moment: Auto-trigger**
User hits an error without reporting anything → Relay Engine proactively opens: "Hey, it looks like something went wrong. I can see the order update didn't go through. Want to tell me what happened?"

---

## Architecture

### Three Layers

```
┌─────────────────────────────────────────────────────┐
│  DEMO CRUD APP (Order Management)                   │
│  /orders, /orders/[id], /checkout                   │
│  PostHog SDK auto-tracking + custom events          │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│  RELAY ENGINE WIDGET (<RelayEngine />)              │
│  Floating bubble → Report mode / Auto-trigger       │
│  → Element selection → Chat panel                   │
│  → Animated timeline → AI conversation              │
│  → Classification reveal                            │
└──────────────────────┬──────────────────────────────┘
                       │ POST /api/chat
┌──────────────────────▼──────────────────────────────┐
│  AGENT API (Vercel AI SDK + OpenAI GPT-4o)          │
│  streamText() with tools + maxSteps                 │
│                                                     │
│  Tools:                                             │
│  ├─ get_user_events    → PostHog REST API           │
│  ├─ read_source_file   → fs.readFile on server      │
│  ├─ search_business_rules → Search MD docs          │
│  ├─ get_element_context → DOM/CSS info              │
│  └─ classify_issue     → Final verdict + save       │
└─────────────────────────────────────────────────────┘
```

### Agent Loop (Vercel AI SDK handles this)

```
User reports issue (manual or auto-triggered)
  → Agent receives: element context + system prompt
  → Agent DECIDES: call get_user_events (PostHog)
  → Agent DECIDES: call read_source_file (relevant code)
  → Agent DECIDES: call search_business_rules
  → Agent has full context → asks user 1-2 clarifying questions
  → User responds
  → Agent calls classify_issue → verdict delivered
```

maxSteps: 5 — agent can chain up to 5 tool calls autonomously per turn.

### File Structure

```
relay-engine/
├── app/
│   ├── layout.tsx                 ← PostHog provider + RelayEngine widget
│   ├── page.tsx                   ← Landing/home
│   ├── api/
│   │   └── chat/
│   │       └── route.ts           ← Agent (tools + OpenAI + Vercel AI SDK)
│   ├── orders/
│   │   ├── page.tsx               ← Orders list
│   │   └── [id]/
│   │       └── page.tsx           ← Order detail (status update flow)
│   ├── checkout/
│   │   └── page.tsx               ← Checkout flow (inventory mismatch)
│   └── reports/
│       └── page.tsx               ← Engineer dashboard
├── components/
│   ├── relay-engine/
│   │   ├── relay-engine.tsx       ← Main wrapper component
│   │   ├── floating-bubble.tsx    ← Trigger button with pulse animation
│   │   ├── element-selector.tsx   ← Report mode overlay + element detection
│   │   ├── chat-panel.tsx         ← Chat UI (uses useChat hook)
│   │   ├── event-timeline.tsx     ← Animated PostHog event timeline
│   │   └── classification-card.tsx← Animated verdict reveal
│   └── ui/                        ← Shared UI components
├── lib/
│   ├── tools/
│   │   ├── posthog.ts             ← PostHog API integration
│   │   ├── codebase.ts            ← File reader tool
│   │   └── business-rules.ts      ← MD doc search tool
│   ├── posthog.ts                 ← PostHog SDK client init
│   └── store.ts                   ← In-memory report storage
└── docs/
    └── BUSINESS_RULES.md          ← Agent reads this for context
```

---

## Demo CRUD App: Order Management

### Pages

**Orders list** (`/orders`): Table of orders with status badges. Filterable.

**Order detail** (`/orders/[id]`): Order info + status update dropdown + item list.

**Checkout** (`/checkout`): Cart → shipping → payment → submit.

### Two Intentional Broken Flows

**Flow 1: Order status skip (UX Issue)**
- User views order in "Pending" status
- Tries to change to "Shipped" directly
- API returns error — status must go Pending → Processing → Shipped
- UI shows cryptic error toast
- **Agent should classify as UX Issue**: The UI shouldn't offer invalid transitions

**Flow 2: Checkout inventory mismatch (Edge Case)**
- User adds items to cart, proceeds to checkout
- Between cart and submit, item goes out of stock (simulated)
- Submit fails with unclear error
- **Agent should classify as Edge Case**: Race condition needing handling

### Business Rules Doc

The agent reads `/docs/BUSINESS_RULES.md` which documents:
- Valid order status transitions
- Inventory reservation rules
- Any intentional behaviors that look like bugs

---

## Relay Engine Widget

### Three Trigger Modes

**Manual report**: User clicks floating bubble → enters report mode → clicks element → chat opens

**Auto-trigger on error**: App error boundary / API error fires → bubble pulses → chatbot proactively opens with empathetic greeting + error context pre-loaded

**Always available**: Bubble is always visible. User can open chat anytime to ask questions or give feedback.

### Floating Bubble
- 48px circle, bottom-right corner
- Idle: subtle breathing animation
- Error detected: gentle pulse glow
- Active (report mode): border highlight + crosshair cursor on page

### Element Selection (Report Mode)
- Hover: soft highlight overlay on elements + element name tooltip
- Click: element outlined, chat panel slides open
- Captures: element tag, CSS selector, visible text, bounding box, nearby elements

### Chat Panel
- Slides in from right, 420px wide
- **Top**: Animated event timeline (PostHog events)
  - Steps appear one-by-one, 150ms stagger
  - Error steps pulse red
  - Current step highlighted
- **Middle**: Chat messages
  - AI first message references timeline + element context
  - Empathetic, conversational tone
  - Messages animate in (slide up + fade)
- **Bottom**: Input field + send

### Classification Card
- Animates into chat after AI reaches conclusion
- Color-coded: Red (Bug), Amber (Edge Case), Blue (UX Issue)
- Shows: classification badge, title, one-line summary, key evidence
- "Reported to the team — you won't have to explain this again." with checkmark animation

---

## Agent Personality (System Prompt Direction)

The agent is an empathetic customer success agent, not a debugging robot:

- Leads with empathy: "That must be frustrating" before investigating
- Uses the user's language, not engineer jargon
- No "500 error on POST /api/orders" — instead "The order update didn't save properly"
- Asks about intent and goals, not just symptoms
- Closes the loop: "I've flagged this for the team with full context. You won't have to explain this again."
- When it identifies a UX issue, offers guided resolution: "Try changing to Processing first, then Shipped — I know the steps aren't obvious and I've noted that for the team"
- Warm but not sycophantic. Professional but human.

---

## Engineer Dashboard (`/reports`)

- Grid of report cards, color-coded by classification
- Each card: title, classification badge, timestamp, user's own words (quote)
- Click to expand: full AI conversation transcript, event timeline, element context, AI synthesis and evidence
- Filter by classification type
- Simple — functional enough for judge deep-dive, not over-built

---

## Frontend Design Direction

**Aesthetic**: Refined, warm, trustworthy. Not cold SaaS. Not playful toy. Think: a calm, competent person who genuinely wants to help. The UI should feel like a conversation with someone who cares.

**Anti-slop rules** (from frontend-design skill):
- NO generic Inter/Roboto/system fonts
- NO purple gradients on white
- NO cookie-cutter component library aesthetic
- Distinctive typography pairing (display + body)
- Intentional color palette with clear hierarchy
- Motion that serves the narrative (timeline stagger, classification reveal)
- Dark mode chat panel for contrast against the demo app

**Key animation moments**:
- Bubble breathing/pulse
- Chat panel slide-in
- Timeline steps staggered entrance
- Message appear animations
- Classification card reveal (scale + bounce)
- Checkmark completion animation

---

## Decisions to Revisit Tomorrow

| # | Decision | Today's Default | Revisit? |
|---|----------|----------------|----------|
| 1 | Data storage | In-memory store | If engineer prefers DB |
| 2 | Demo broken flows | Status skip + inventory mismatch | May want different scenarios |
| 3 | AI follow-up count | 2 questions before classify | Adjust for demo pacing |
| 4 | Dashboard polish | Functional, clean, minimal | Based on remaining time |
| 5 | PostHog event depth | Event timeline + error capture | Based on API access |
| 6 | Number of agent tools | 4-5 tools | May add/remove based on demo |
| 7 | Auto-trigger behavior | Open proactively on errors | May want gentler nudge |

---

## Demo Script (3 minutes)

**0:00 — The Pain (30s)**
"Every day, users hit bugs and try to tell someone. By the time it reaches an engineer, half the context is lost. Let me show you what that looks like today..." (show vague Slack message screenshot)

**0:30 — The Product (15s)**
"Relay Engine is an AI agent that lives inside your app. When users hit a problem, it captures everything — what they did, what went wrong, and why it matters."

**0:45 — Demo Flow 1: Manual Report (60s)**
User navigates to orders → tries status update → gets error → clicks Relay Engine bubble → report mode → clicks the broken dropdown → chat opens with animated timeline → AI asks "Were you expecting to skip Processing?" → user responds → classification card: UX Issue

**1:45 — Demo Flow 2: Auto-Trigger (45s)**
User goes to checkout → submits → error happens → Relay Engine proactively opens → "Hey, something went wrong with your checkout. I can see the items were in your cart but the submission failed." → quick conversation → classification: Edge Case → "I've noted this for the team, you won't need to explain this again"

**2:30 — Engineer Dashboard (20s)**
Switch to /reports → show both reports with full context, AI synthesis, event timelines

**2:50 — Closing (10s)**
"Zero information loss. Zero engineer back-and-forth. A 24/7 CSM that actually understands what happened."
