'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { TimelineEvent } from '@/lib/types'
import { MOCK_TIMELINE_EVENTS } from '@/lib/mock-data'
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

  // Wait for client-side mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Listen for relay-engine:error events
  useEffect(() => {
    function handleError(e: Event) {
      const detail = (e as CustomEvent).detail
      setHasError(true)
      setErrorMessage(detail?.message || 'An error occurred')

      // After 1500ms, auto-open the chat panel
      setTimeout(() => {
        setAutoTriggered(true)
        setMode('chat')
        setTimelineEvents(MOCK_TIMELINE_EVENTS)
      }, 1500)
    }

    window.addEventListener('relay-engine:error', handleError)
    return () => window.removeEventListener('relay-engine:error', handleError)
  }, [])

  const handleBubbleClick = useCallback(() => {
    setMode((prev) => {
      if (prev === 'idle') return 'report'
      if (prev === 'report') return 'idle'
      // If chat is open, close everything and reset
      return 'idle'
    })

    // If we were in chat mode, reset everything
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
      setTimelineEvents(MOCK_TIMELINE_EVENTS)
      setMode('chat')
    },
    []
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
