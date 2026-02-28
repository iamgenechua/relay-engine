import { posthog } from '@/lib/posthog'

const MAX_BUFFERED_EVENTS = 500
const eventBuffer: unknown[] = []

export function bufferEvent(event: unknown): void {
  eventBuffer.push(event)
  if (eventBuffer.length > MAX_BUFFERED_EVENTS) {
    eventBuffer.shift()
  }
}

export function getBufferedEvents(): unknown[] {
  return [...eventBuffer]
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
