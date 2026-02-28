import { MOCK_TIMELINE_EVENTS } from '@/lib/mock-data'
import type { TimelineEvent } from '@/lib/types'

export async function getUserEvents(
  sessionId: string
): Promise<TimelineEvent[]> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID

  if (!apiKey || !projectId) {
    return MOCK_TIMELINE_EVENTS
  }

  try {
    const host =
      process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
    const res = await fetch(
      `${host}/api/projects/${projectId}/events?session_id=${encodeURIComponent(sessionId)}&limit=20`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    )

    if (!res.ok) {
      return MOCK_TIMELINE_EVENTS
    }

    const data = await res.json()
    return (data.results ?? []).map(
      (e: Record<string, unknown>, i: number) => ({
        id: `evt-${i}`,
        event: String(e.event ?? ''),
        description: String(
          (e.properties as Record<string, unknown>)?.['$current_url'] ??
            e.event ??
            ''
        ),
        timestamp: String(e.timestamp ?? ''),
        isError: String(e.event ?? '').includes('error'),
        properties: (e.properties ?? {}) as Record<string, unknown>,
      })
    )
  } catch {
    return MOCK_TIMELINE_EVENTS
  }
}
