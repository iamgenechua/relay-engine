# Stateless Chat Architecture Design

**Date:** 2026-02-28
**Status:** Approved

## Context

The relay-engine chat widget uses Vercel AI SDK's `useChat` + `DefaultChatTransport` to stream messages to a FastAPI server at `/api/fde/stream`. The server runs an OpenAI agent loop with tools (getUserEvents, readSourceFile, searchBusinessRules, classifyIssue) and streams responses back via SSE.

## Decision: Stateless, re-send everything

Every message sends the full message history + static context (recentEvents, pageSnapshot, elementContext, etc.). Server rebuilds the system prompt each request. No session store.

### Why

- Already built and working
- ~50-100KB overhead per message is negligible for a support widget
- No session management, expiry, or cache invalidation
- Easy to deploy and scale (any server instance can handle any request)

### Trade-offs accepted

- Agent loses tool call history between turns (only sees text messages). It may re-investigate on follow-ups. This is acceptable — the text responses carry enough context.
- Context fields are re-sent on every message even though they're static per conversation. The bandwidth cost is trivial.

## Data flow

```
User clicks element → chat opens → user types message
    ↓
Frontend (useChat + DefaultChatTransport) POSTs /api/fde/stream:
  { messages, elementContext, recentEvents, pageSnapshot, sessionId, ... }
    ↓
Server: build_system_prompt(req) → OpenAI agent loop → SSE stream
    ↓
Frontend renders streamed text + tool calls + classification card
    ↓
User responds → repeat
```

## Frontend mode cleanup

Remove `'chat'` from Mode type. Use `'idle' | 'report'` + separate `isChatOpen` state.

- Bubble click: idle → report, report → idle, chat open → close chat + idle
- Element select: sets elementContext + isChatOpen = true (stays in report)
- Error auto-trigger: sets error state + isChatOpen = true
- Close chat: isChatOpen = false, reset context, back to idle

## Endpoints

- `POST /api/fde/stream` — handles the full chat flow (already exists)
- `GET /api/fde/reports` — dashboard report list (already exists)
- No new endpoints needed
