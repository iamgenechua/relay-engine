'use client'

import { motion } from 'framer-motion'
import type { TimelineEvent } from '@/lib/types'

interface EventTimelineProps {
  events: TimelineEvent[]
  isVisible: boolean
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
        borderBottom: '1px solid var(--color-border-subtle)',
        overflow: 'hidden',
      }}
      className="px-5 pb-4 pt-3"
    >
      {/* Header */}
      <p
        className="font-display"
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--color-text-secondary)',
          marginBottom: 14,
          letterSpacing: '0.02em',
        }}
      >
        Your session
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
            background: 'var(--color-border)',
          }}
        />

        {events.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: index * 0.12,
              duration: 0.45,
              ease: staggerEasing,
            }}
            className="relative flex items-start gap-3"
            style={{
              paddingBottom: index < events.length - 1 ? 14 : 4,
            }}
          >
            {/* Dot — consistent small dots, red for errors */}
            <div
              className="flex-shrink-0"
              style={{
                position: 'absolute',
                left: -20,
                top: 4,
                width: event.isError ? 8 : 6,
                height: event.isError ? 8 : 6,
                borderRadius: '50%',
                transform: 'translateX(-0.5px)',
                ...(event.isError
                  ? {
                      background: 'var(--color-bug)',
                      boxShadow: '0 0 0 0 rgba(155, 59, 59, 0.5)',
                      animation: 'error-pulse 2s ease-in-out infinite',
                    }
                  : {
                      background: 'var(--color-border)',
                    }),
              }}
            />

            {/* Content */}
            <div className="flex-1 flex items-baseline justify-between gap-2 min-w-0">
              <span
                className="font-body"
                style={{
                  fontSize: 13,
                  fontWeight: event.isError ? 500 : 400,
                  color: event.isError
                    ? 'var(--color-bug)'
                    : 'var(--color-text)',
                  lineHeight: 1.4,
                }}
              >
                {event.description}
              </span>

              <span
                className="font-mono flex-shrink-0"
                style={{
                  fontSize: 10,
                  color: 'var(--color-text-tertiary)',
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
