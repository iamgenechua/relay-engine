'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { initPostHog, posthog } from '@/lib/posthog'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog()
  }, [])

  const pathname = usePathname()

  useEffect(() => {
    if (pathname && posthog.__loaded) {
      posthog.capture('$pageview')
    }
  }, [pathname])

  return <>{children}</>
}
