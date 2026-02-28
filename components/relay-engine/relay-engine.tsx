'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { TimelineEvent } from '@/lib/types'
import type { RelayContext } from '@/lib/relay-collector'
import { sendContext, getSessionId, getDistinctId, capturePageSnapshot } from '@/lib/relay-collector'
import FloatingBubble from '@/components/relay-engine/floating-bubble'
import ElementSelector from '@/components/relay-engine/element-selector'
import ChatPanel from '@/components/relay-engine/chat-panel'

type Mode = 'idle' | 'report' | 'chat'

export default function RelayEngine() {
  const [mounted, setMounted] = useState(false)
  const [mode, setMode] = useState<Mode>('idle')
  const [elementContext, setElementContext] = useState<{
    elementName: string
    cssSelector: string
    visibleText: string
    boundingBox: DOMRect | null
  } | null>(null)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [autoTriggered, setAutoTriggered] = useState(false)
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])

  const sessionLog = useRef<TimelineEvent[]>([])
  const sessionStartedAt = useRef(new Date().toISOString())
  const sessionStart = useRef(Date.now())
  const eventCounter = useRef(0)
  const lastTrackedPath = useRef('')

  useEffect(() => {
    setMounted(true)
  }, [])

  const logEvent = useCallback((event: string, description: string, isError = false) => {
    const id = `evt-${eventCounter.current++}`
    const elapsed = (Date.now() - sessionStart.current) / 1000
    const minutes = Math.floor(elapsed / 60)
    const seconds = Math.floor(elapsed % 60)
    const timestamp = `${minutes}:${String(seconds).padStart(2, '0')}`

    sessionLog.current = [...sessionLog.current, {
      id,
      event,
      description,
      timestamp,
      isError,
    }].slice(-10)
  }, [])

  // Track page navigations
  useEffect(() => {
    const trackNavigation = () => {
      const path = window.location.pathname
      if (lastTrackedPath.current === path) return
      lastTrackedPath.current = path

      const name = path === '/' ? 'Store home'
        : path === '/orders' ? 'Orders list'
        : path === '/reports' ? 'Reports'
        : path.startsWith('/orders/') ? `Order ${path.split('/').pop()}`
        : path
      logEvent('pageview', `Viewed ${name}`)
    }

    trackNavigation()

    window.addEventListener('popstate', () => trackNavigation())

    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as Element)?.closest?.('a')
      if (anchor?.href && anchor.href.startsWith(window.location.origin)) {
        setTimeout(trackNavigation, 50)
      }

      // Track button clicks
      const button = (e.target as Element)?.closest?.('button')
      if (button && !button.closest('[data-relay-engine]')) {
        const label = button.getAttribute('aria-label')
          || button.textContent?.trim().slice(0, 40)
          || 'button'
        logEvent('click', `Clicked "${label}"`)
      }
    }
    document.addEventListener('click', handleClick, true)

    return () => {
      document.removeEventListener('click', handleClick, true)
    }
  }, [logEvent])

  const getSessionEvents = useCallback((): TimelineEvent[] => {
    return [...sessionLog.current]
  }, [])

  const emitContext = useCallback((
    trigger: RelayContext['trigger'],
    elCtx: typeof elementContext,
    errMsg: string | undefined,
    autoTrig: boolean,
  ) => {
    const ctx: RelayContext = {
      sessionId: getSessionId(),
      distinctId: getDistinctId(),
      sessionStartedAt: sessionStartedAt.current,
      currentUrl: window.location.href,
      currentPath: window.location.pathname,
      userAgent: navigator.userAgent,
      screenSize: { width: window.innerWidth, height: window.innerHeight },
      elementContext: elCtx
        ? {
            elementName: elCtx.elementName,
            cssSelector: elCtx.cssSelector,
            visibleText: elCtx.visibleText,
            boundingBox: elCtx.boundingBox
              ? { top: elCtx.boundingBox.top, left: elCtx.boundingBox.left, width: elCtx.boundingBox.width, height: elCtx.boundingBox.height }
              : null,
          }
        : null,
      errorContext: errMsg ? { message: errMsg, autoTriggered: autoTrig } : null,
      conversation: [],
      pageSnapshot: capturePageSnapshot(),
      trigger,
    }
    sendContext(ctx)
  }, [])

  // Listen for error events from the store
  useEffect(() => {
    function handleError(e: Event) {
      const detail = (e as CustomEvent).detail
      const msg = detail?.message || 'An error occurred'
      setHasError(true)
      setErrorMessage(msg)
      logEvent('api_error', msg, true)

      setTimeout(() => {
        setAutoTriggered(true)
        setMode('chat')
        setTimelineEvents(getSessionEvents())
        emitContext('error_auto', null, msg, true)
      }, 1500)
    }

    window.addEventListener('relay-engine:error', handleError)
    return () => window.removeEventListener('relay-engine:error', handleError)
  }, [logEvent, getSessionEvents])

  const handleBubbleClick = useCallback(() => {
    setMode((prev) => {
      if (prev === 'idle') return 'report'
      if (prev === 'report') return 'idle'
      return 'idle'
    })

    if (mode === 'chat') {
      setElementContext(null)
      setHasError(false)
      setErrorMessage('')
      setAutoTriggered(false)
      setTimelineEvents([])
    }
  }, [mode])

  const handleElementSelect = useCallback(
    (context: {
      elementName: string
      cssSelector: string
      visibleText: string
      boundingBox: DOMRect
    }) => {
      setElementContext(context)
      setTimelineEvents(getSessionEvents())
      setMode('chat')
      emitContext('element_select', context, undefined, false)
    },
    [getSessionEvents, emitContext]
  )

  const handleChatClose = useCallback(() => {
    setMode('idle')
    setElementContext(null)
    setHasError(false)
    setErrorMessage('')
    setAutoTriggered(false)
    setTimelineEvents([])
  }, [])

  if (!mounted) return null

  return createPortal(
    <div data-relay-engine>
      <FloatingBubble
        isReportMode={mode === 'report'}
        hasError={hasError && mode === 'idle'}
        onClick={handleBubbleClick}
      />
      <ElementSelector
        isActive={mode === 'report'}
        onElementSelect={handleElementSelect}
      />
      <ChatPanel
        isOpen={mode === 'chat'}
        onClose={handleChatClose}
        elementContext={elementContext}
        timelineEvents={timelineEvents}
        autoTriggered={autoTriggered}
        errorMessage={errorMessage}
      />
    </div>,
    document.body
  )
}
