import { posthog } from '@/lib/posthog'

const SERVER_URL = process.env.NEXT_PUBLIC_RELAY_SERVER_URL || ''

export interface RelayContext {
  sessionId: string
  distinctId: string
  sessionStartedAt: string
  currentUrl: string
  currentPath: string
  userAgent: string
  screenSize: { width: number; height: number }

  elementContext: {
    elementName: string
    cssSelector: string
    visibleText: string
    boundingBox: { top: number; left: number; width: number; height: number } | null
  } | null

  errorContext: {
    message: string
    autoTriggered: boolean
  } | null

  conversation: Array<{
    role: 'user' | 'assistant'
    content: string
  }>

  pageSnapshot: string

  trigger: 'error_auto' | 'element_select' | 'manual_chat'
}

const MAX_BUFFERED_EVENTS = 500
const eventBuffer: unknown[] = []

export function bufferEvent(event: unknown): void {
  eventBuffer.push(event)
  if (eventBuffer.length > MAX_BUFFERED_EVENTS) {
    eventBuffer.shift()
  }
}

export function sendContext(context: RelayContext): void {
  if (!SERVER_URL) return
  try {
    fetch(`${SERVER_URL}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...context, recentEvents: [...eventBuffer] }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // never break the app
  }
}

export function getSessionId(): string {
  if (posthog.__loaded && posthog.get_session_id) {
    return posthog.get_session_id()
  }
  const key = 'relay_session_id'
  let id = sessionStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(key, id)
  }
  return id
}

export function getDistinctId(): string {
  if (posthog.__loaded && posthog.get_distinct_id) {
    return posthog.get_distinct_id()
  }
  return 'anonymous'
}

export function capturePageSnapshot(): string {
  const clone = document.body.cloneNode(true) as HTMLElement
  clone.querySelectorAll('script, style, [data-relay-engine]').forEach((el) => el.remove())
  return clone.innerHTML.slice(0, 50_000)
}
