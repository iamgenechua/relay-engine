'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { TimelineEvent } from '@/lib/types'
import { posthog } from '@/lib/posthog'
import { getBufferedEvents, capturePageSnapshot } from '@/lib/relay-collector'
import EventTimeline from '@/components/relay-engine/event-timeline'
import ClassificationCard from '@/components/relay-engine/classification-card'
import ActionCard from '@/components/relay-engine/action-card'

interface ChatPanelProps {
  isOpen: boolean
  onClose: () => void
  elementContext: {
    elementName: string
    cssSelector: string
    visibleText: string
    boundingBox: DOMRect | null
  } | null
  timelineEvents: TimelineEvent[]
  autoTriggered?: boolean
  errorMessage?: string
}

const PANEL_WIDTH = 380
const PANEL_HEIGHT = 520
const PANEL_GAP = 12

const easeCurve: [number, number, number, number] = [0.22, 1, 0.36, 1]

const panelVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: easeCurve },
  },
  exit: {
    opacity: 0,
    y: 12,
    scale: 0.97,
    transition: { duration: 0.2, ease: easeCurve },
  },
}

const messageVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: easeCurve },
  },
}

function computePosition(boundingBox: DOMRect | null): React.CSSProperties {
  // If no bounding box (auto-triggered), position near bottom-right above the bubble
  if (!boundingBox) {
    return {
      position: 'fixed' as const,
      bottom: 76,
      right: 24,
    }
  }

  const vw = window.innerWidth
  const vh = window.innerHeight

  // Try positioning below the element
  const belowTop = boundingBox.bottom + PANEL_GAP
  const belowFits = belowTop + PANEL_HEIGHT < vh - 16

  // Try positioning above the element
  const aboveBottom = vh - boundingBox.top + PANEL_GAP
  const aboveFits = boundingBox.top - PANEL_GAP - PANEL_HEIGHT > 16

  // Horizontal: try to align left edge with element, then clamp
  let left = boundingBox.left
  if (left + PANEL_WIDTH > vw - 16) {
    left = vw - PANEL_WIDTH - 16
  }
  if (left < 16) {
    left = 16
  }

  if (belowFits) {
    return {
      position: 'fixed' as const,
      top: belowTop,
      left,
    }
  }

  if (aboveFits) {
    return {
      position: 'fixed' as const,
      bottom: aboveBottom,
      left,
    }
  }

  // Fallback: position to the right of the element
  const rightLeft = boundingBox.right + PANEL_GAP
  if (rightLeft + PANEL_WIDTH < vw - 16) {
    let top = boundingBox.top
    if (top + PANEL_HEIGHT > vh - 16) {
      top = vh - PANEL_HEIGHT - 16
    }
    if (top < 16) top = 16
    return {
      position: 'fixed' as const,
      top,
      left: rightLeft,
    }
  }

  // Final fallback: near bottom-right
  return {
    position: 'fixed' as const,
    bottom: 76,
    right: 24,
  }
}

function parseClassification(messages: any[]) {
  for (const msg of messages) {
    if (msg.role === 'assistant' && msg.parts) {
      for (const part of msg.parts as any[]) {
        if (
          part.type === 'dynamic-tool' &&
          part.toolName === 'classifyIssue' &&
          part.state === 'output-available'
        ) {
          return part.output as {
            type: 'bug' | 'edge_case' | 'ux_issue'
            title: string
            summary: string
            evidence: string
          }
        }
        if (
          (part as any).type === 'tool-invocation' &&
          (part as any).toolName === 'classifyIssue' &&
          (part as any).state === 'result'
        ) {
          return (part as any).result as {
            type: 'bug' | 'edge_case' | 'ux_issue'
            title: string
            summary: string
            evidence: string
          }
        }
      }
    }
  }
  return null
}

function parseActions(messages: any[]): PendingAction[] {
  const actions: PendingAction[] = []
  for (const msg of messages) {
    if (msg.role === 'assistant' && msg.parts) {
      for (const part of msg.parts as any[]) {
        if (
          part.type === 'dynamic-tool' &&
          part.state === 'output-available' &&
          part.output?.type === 'require-action'
        ) {
          actions.push({
            toolCallId: part.output.toolCallId,
            toolName: part.output.toolName,
            input: part.output.input,
          })
        }
      }
    }
  }
  return actions
}

function getMessageText(msg: any): string {
  if (!msg.parts) return msg.content || ''
  const text = msg.parts
    .filter((p: any) => p.type === 'text')
    .map((p: any) => p.text)
    .join('')
  return text || msg.content || ''
}

interface PendingAction {
  toolCallId: string
  toolName: string
  input: Record<string, unknown>
}

function SendIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function BouncingDots() {
  return (
    <div className="flex items-center gap-1" style={{ padding: '6px 0' }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -3, 0] }}
          transition={{
            duration: 0.7,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
          style={{
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: 'var(--color-text-tertiary)',
          }}
        />
      ))}
    </div>
  )
}

export default function ChatPanel({
  isOpen,
  onClose,
  elementContext,
  timelineEvents,
  autoTriggered,
  errorMessage,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [posStyle, setPosStyle] = useState<React.CSSProperties>({})
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([])

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: `${process.env.NEXT_PUBLIC_FDE_URL || 'http://localhost:8000'}/api/fde/stream`,
      body: {
        elementContext,
        autoTriggered,
        errorMessage,
        sessionId: posthog.__loaded ? posthog.get_session_id?.() : undefined,
        recentEvents: getBufferedEvents(),
        pageSnapshot: capturePageSnapshot(),
      },
    }),
    onError: (error) => {
      console.error('[relay] Chat error:', error)
    },
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  // Log status changes
  useEffect(() => {
    console.log('[relay] Chat status:', status, '| messages:', messages.length)
  }, [status, messages.length])

  // Compute anchored position when panel opens
  useEffect(() => {
    if (isOpen) {
      const box = elementContext?.boundingBox ?? null
      setPosStyle(computePosition(box))
    }
  }, [isOpen, elementContext])

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const classification = parseClassification(messages)

  // Debug: log message structure
  useEffect(() => {
    if (messages.length > 0) {
      console.log('[relay] Messages:', JSON.stringify(messages.map(m => ({
        id: m.id,
        role: m.role,
        content: (m as any).content,
        parts: m.parts,
        keys: Object.keys(m),
      })), null, 2))
    }
  }, [messages])

  useEffect(() => {
    const actions = parseActions(messages)
    if (actions.length > 0) {
      setPendingActions(actions)
    }
  }, [messages])

  const visibleMessages = messages.filter((msg) => {
    const text = getMessageText(msg)
    return text.trim().length > 0
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const input = form.elements.namedItem('message') as HTMLInputElement
    const value = input.value.trim()
    console.log('[relay] handleSubmit fired — value:', JSON.stringify(value), '| isLoading:', isLoading)
    if (!value || isLoading) return
    console.log('[relay] Sending message:', value.slice(0, 100))
    sendMessage({ text: value })
    input.value = ''
  }

  const TOOL_ROUTES: Record<string, (input: Record<string, unknown>) => { method: string; url: string; body?: unknown }> = {
    getOrders: () => ({ method: 'GET', url: '/api/orders' }),
    getOrder: (input) => ({ method: 'GET', url: `/api/orders/${input.orderId}` }),
    getProducts: () => ({ method: 'GET', url: '/api/products' }),
    updateOrderStatus: (input) => ({
      method: 'PATCH',
      url: `/api/orders/${input.orderId}/status`,
      body: { status: input.newStatus },
    }),
    checkout: (input) => ({
      method: 'POST',
      url: '/api/checkout',
      body: { items: input.items, customerName: input.customerName, customerEmail: input.customerEmail },
    }),
  }

  async function handleActionApprove(toolCallId: string, toolName: string, input: Record<string, unknown>) {
    const routeFn = TOOL_ROUTES[toolName]
    if (!routeFn) {
      console.error('[relay] Unknown tool:', toolName)
      return
    }

    const { method, url, body } = routeFn(input)

    try {
      const res = await fetch(url, {
        method,
        ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
      })
      const result = await res.json()

      sendMessage({
        text: JSON.stringify({
          type: 'tool-result',
          toolCallId,
          toolName,
          result,
        }),
      })
    } catch (err) {
      console.error('[relay] Action execution failed:', err)
      sendMessage({
        text: JSON.stringify({
          type: 'tool-result',
          toolCallId,
          toolName,
          result: { error: 'Action execution failed' },
        }),
      })
    } finally {
      setPendingActions((prev) => prev.filter((a) => a.toolCallId !== toolCallId))
    }
  }

  function handleActionDeny(toolCallId: string) {
    sendMessage({
      text: JSON.stringify({
        type: 'tool-result',
        toolCallId,
        result: { denied: true, reason: 'User declined' },
      }),
    })
    setPendingActions((prev) => prev.filter((a) => a.toolCallId !== toolCallId))
  }

  // Random gradient blob positions (stable per mount)
  const blobPositions = useMemo(() => [
    { top: '8%', left: '12%', color: 'rgba(232, 199, 174, 0.4)', size: 120 },
    { top: '55%', right: '8%', color: 'rgba(200, 218, 196, 0.35)', size: 100 },
    { bottom: '15%', left: '35%', color: 'rgba(242, 240, 236, 0.5)', size: 90 },
  ], [])

  if (typeof window === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          data-relay-engine
          key="chat-panel"
          variants={panelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{
            ...posStyle,
            width: PANEL_WIDTH,
            maxHeight: PANEL_HEIGHT,
            zIndex: 9998,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: '0 8px 40px rgba(26, 26, 24, 0.12), 0 2px 8px rgba(26, 26, 24, 0.06)',
          }}
        >
          {/* Gradient mesh background layer */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              borderRadius: 20,
              overflow: 'hidden',
              pointerEvents: 'none',
            }}
          >
            {blobPositions.map((blob, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: blob.top,
                  left: (blob as any).left,
                  right: (blob as any).right,
                  bottom: (blob as any).bottom,
                  width: blob.size,
                  height: blob.size,
                  borderRadius: '50%',
                  background: blob.color,
                  filter: 'blur(40px)',
                }}
              />
            ))}
          </div>

          {/* Frosted glass layer */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 1,
              background: 'rgba(255, 255, 255, 0.72)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderRadius: 20,
              border: '1px solid rgba(255, 255, 255, 0.5)',
              pointerEvents: 'none',
            }}
          />

          {/* Content layer */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              maxHeight: PANEL_HEIGHT,
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: 'var(--color-accent)',
                  }}
                />
                <span
                  className="font-body"
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--color-text)',
                    letterSpacing: '0.01em',
                  }}
                >
                  Support
                </span>
              </div>
              <button
                onClick={onClose}
                aria-label="Close support panel"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-tertiary)',
                  padding: 4,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = 'var(--color-text)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = 'var(--color-text-tertiary)')
                }
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Event Timeline */}
            <EventTimeline events={timelineEvents} isVisible={timelineEvents.length > 0} />

            {/* Messages area */}
            <div
              className="flex-1 widget-scroll"
              style={{
                overflowY: 'auto',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {visibleMessages.map((msg) => {
                const text = getMessageText(msg)
                const isUser = msg.role === 'user'
                return (
                  <motion.div
                    key={msg.id}
                    variants={messageVariants}
                    initial="hidden"
                    animate="visible"
                    style={{
                      display: 'flex',
                      justifyContent: isUser ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      className="font-body"
                      style={{
                        maxWidth: '85%',
                        padding: '10px 14px',
                        fontSize: 14,
                        lineHeight: 1.55,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        ...(isUser
                          ? {
                              background: 'var(--color-accent-light)',
                              color: 'var(--color-text)',
                              borderRadius: '14px 14px 4px 14px',
                            }
                          : {
                              background: 'rgba(255, 255, 255, 0.6)',
                              color: 'var(--color-text)',
                              borderRadius: '14px 14px 14px 4px',
                            }),
                      }}
                    >
                      {text}
                    </div>
                  </motion.div>
                )
              })}

              {/* Classification card */}
              {classification && (
                <div style={{ padding: '4px 0' }}>
                  <ClassificationCard
                    type={classification.type}
                    title={classification.title}
                    summary={classification.summary}
                    evidence={classification.evidence}
                  />
                </div>
              )}

              {/* Action approval cards */}
              {pendingActions.map((action) => (
                <div key={action.toolCallId} style={{ padding: '4px 0' }}>
                  <ActionCard
                    toolName={action.toolName}
                    toolCallId={action.toolCallId}
                    input={action.input}
                    onApprove={handleActionApprove}
                    onDeny={handleActionDeny}
                  />
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.6)',
                      borderRadius: '14px 14px 14px 4px',
                      padding: '6px 14px',
                    }}
                  >
                    <BouncingDots />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div
              style={{
                borderTop: '1px solid var(--color-border-subtle)',
                padding: '12px 16px',
              }}
            >
              <form onSubmit={handleSubmit}>
                <div
                  className="flex items-center gap-2"
                  style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    borderRadius: 12,
                    padding: '8px 10px 8px 14px',
                    border: '1px solid var(--color-border-subtle)',
                  }}
                >
                  <input
                    name="message"
                    type="text"
                    placeholder="What happened?"
                    autoComplete="off"
                    className="font-body"
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontSize: 13,
                      color: 'var(--color-text)',
                      lineHeight: 1.4,
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    aria-label="Send message"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: 'var(--color-accent)',
                      color: '#ffffff',
                      border: 'none',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      opacity: isLoading ? 0.4 : 1,
                      transition: 'opacity 0.15s ease',
                    }}
                  >
                    <SendIcon />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
