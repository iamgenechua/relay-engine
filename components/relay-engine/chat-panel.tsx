'use client'

import { useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { TimelineEvent } from '@/lib/types'
import EventTimeline from '@/components/relay-engine/event-timeline'
import ClassificationCard from '@/components/relay-engine/classification-card'

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

const panelVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: 20,
    scale: 0.95,
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
  },
}

const messageVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
}

function parseClassification(messages: any[]) {
  for (const msg of messages) {
    if (msg.role === 'assistant' && msg.parts) {
      for (const part of msg.parts as any[]) {
        // AI SDK v6: dynamic-tool parts with state 'output-available'
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
        // Also support the tool-invocation pattern from the spec
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

function getMessageText(msg: any): string {
  if (!msg.parts) return ''
  return msg.parts
    .filter((p: any) => p.type === 'text')
    .map((p: any) => p.text)
    .join('')
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
    <div className="flex items-center gap-1" style={{ padding: '8px 0' }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -4, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: 'var(--color-chat-text-secondary)',
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

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: {
        elementContext,
        autoTriggered,
        errorMessage,
      },
    }),
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const classification = parseClassification(messages)

  // Filter messages to only show those with text content
  const visibleMessages = messages.filter((msg) => {
    const text = getMessageText(msg)
    return text.trim().length > 0
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const input = form.elements.namedItem('message') as HTMLInputElement
    const value = input.value.trim()
    if (!value || isLoading) return
    sendMessage({ text: value })
    input.value = ''
  }

  if (typeof window === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="chat-panel"
          variants={panelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{
            position: 'fixed',
            bottom: 76,
            right: 24,
            width: 420,
            height: 600,
            zIndex: 9998,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--color-chat-bg)',
            borderRadius: '16px 16px 16px 8px',
            border: '1px solid var(--color-chat-border)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid var(--color-chat-border)' }}
          >
            <div className="flex items-center gap-2.5">
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 6px rgba(16, 185, 129, 0.4)',
                }}
              />
              <div>
                <h3
                  className="font-display"
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--color-chat-text)',
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  Relay Engine
                </h3>
                <p
                  style={{
                    fontSize: 11,
                    color: 'var(--color-chat-text-secondary)',
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  AI Support Agent
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close chat panel"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-chat-text-secondary)',
                padding: 4,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = 'var(--color-chat-text)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = 'var(--color-chat-text-secondary)')
              }
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
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
            className="flex-1"
            style={{
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
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
                    style={{
                      maxWidth: '85%',
                      padding: '10px 14px',
                      fontSize: 13,
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      ...(isUser
                        ? {
                            background: 'var(--color-accent)',
                            color: '#ffffff',
                            borderRadius: '14px 14px 4px 14px',
                          }
                        : {
                            background: 'var(--color-chat-surface)',
                            color: 'var(--color-chat-text)',
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

            {/* Loading indicator */}
            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div
                  style={{
                    background: 'var(--color-chat-surface)',
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
              borderTop: '1px solid var(--color-chat-border)',
              padding: '12px 16px',
            }}
          >
            <form onSubmit={handleSubmit}>
              <div
                className="flex items-center gap-2"
                style={{
                  background: 'var(--color-chat-input-bg)',
                  borderRadius: 12,
                  padding: '8px 10px 8px 14px',
                }}
              >
                <input
                  name="message"
                  type="text"
                  placeholder="Describe what happened..."
                  autoComplete="off"
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: 13,
                    color: 'var(--color-chat-text)',
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
                    opacity: isLoading ? 0.5 : 1,
                    transition: 'opacity 0.15s ease',
                  }}
                >
                  <SendIcon />
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
