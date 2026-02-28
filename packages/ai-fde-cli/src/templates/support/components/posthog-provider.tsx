'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { initPostHog, posthog } from '@/lib/posthog'
import { bufferEvent } from '@/lib/relay-collector'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog()

    if (posthog.__loaded) {
      posthog.on('eventCaptured', bufferEvent)
    }

    return () => {
      // posthog-js doesn't expose removeListener, but the callback
      // is a no-op when SERVER_URL is empty and safe to leave attached
    }
  }, [])

  const pathname = usePathname()

  useEffect(() => {
    if (pathname && posthog.__loaded) {
      posthog.capture('$pageview')
    }
  }, [pathname])

  return <>{children}</>
}
