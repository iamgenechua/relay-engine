'use client'

import { motion } from 'framer-motion'
import type { TimelineEvent } from '@/lib/types'

interface EventTimelineProps {
  events: TimelineEvent[]
  isVisible: boolean
}

const eventEmojis: Record<string, string> = {
  pageview: '\u{1F4C4}',
  click: '\u{1F446}',
  api_error: '\u26A0\uFE0F',
  form_submit: '\u{1F4DD}',
  navigation: '\u{1F517}',
}

const staggerEasing: [number, number, number, number] = [0.22, 1, 0.36, 1]

export default function EventTimeline({
  events,
  isVisible,
}: EventTimelineProps) {
  if (!isVisible || events.length === 0) return null

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{
        borderBottom: '1px solid var(--color-chat-border)',
        overflow: 'hidden',
      }}
      className="px-4 pb-3 pt-2"
    >
      {/* Header */}
      <p
        className="font-mono uppercase tracking-widest"
        style={{
          fontSize: 10,
          color: 'var(--color-chat-text-secondary)',
          marginBottom: 12,
        }}
      >
        Your journey
      </p>

      {/* Timeline */}
      <div className="relative" style={{ paddingLeft: 20 }}>
        {/* Vertical line */}
        <div
          style={{
            position: 'absolute',
            left: 5,
            top: 4,
            bottom: 4,
            width: 1,
            background: 'var(--color-chat-border)',
          }}
        />

        {events.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: index * 0.15,
              duration: 0.5,
              ease: staggerEasing,
            }}
            className="relative flex items-start gap-3"
            style={{
              paddingBottom: index < events.length - 1 ? 14 : 4,
            }}
          >
            {/* Dot */}
            <div
              className="flex-shrink-0"
              style={{
                position: 'absolute',
                left: -20,
                top: 3,
                width: 10,
                height: 10,
                borderRadius: '50%',
                transform: 'translateX(-0.5px)',
                ...(event.isError
                  ? {
                      background: '#DC2626',
                      boxShadow: '0 0 0 0 rgba(220, 38, 38, 0.6)',
                      animation: 'error-pulse 2s ease-in-out infinite',
                    }
                  : {
                      background: 'var(--color-chat-surface)',
                      border: '1.5px solid var(--color-chat-border)',
                    }),
              }}
            />

            {/* Content */}
            <div className="flex-1 flex items-baseline justify-between gap-2 min-w-0">
              <span
                className={event.isError ? 'font-medium' : ''}
                style={{
                  fontSize: 13,
                  color: event.isError
                    ? '#f87171'
                    : 'var(--color-chat-text)',
                  lineHeight: 1.4,
                }}
              >
                <span className="mr-1.5">
                  {eventEmojis[event.event] || '\u{1F4CB}'}
                </span>
                {event.description}
              </span>

              <span
                className="font-mono flex-shrink-0"
                style={{
                  fontSize: 10,
                  color: 'var(--color-chat-text-secondary)',
                }}
              >
                {event.timestamp}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

    </motion.div>
  )
}
