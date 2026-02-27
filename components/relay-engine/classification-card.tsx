'use client'

import { motion } from 'framer-motion'

interface ClassificationCardProps {
  type: 'bug' | 'edge_case' | 'ux_issue'
  title: string
  summary: string
  evidence: string
}

const themes = {
  bug: {
    border: 'rgba(239, 68, 68, 0.4)',
    bg: 'rgba(239, 68, 68, 0.1)',
    text: '#f87171',
    badgeBg: 'rgba(239, 68, 68, 0.2)',
    emoji: '\u{1F41B}',
    label: 'Bug Detected',
  },
  edge_case: {
    border: 'rgba(245, 158, 11, 0.4)',
    bg: 'rgba(245, 158, 11, 0.1)',
    text: '#fbbf24',
    badgeBg: 'rgba(245, 158, 11, 0.2)',
    emoji: '\u{1F50D}',
    label: 'Edge Case Found',
  },
  ux_issue: {
    border: 'rgba(59, 130, 246, 0.4)',
    bg: 'rgba(59, 130, 246, 0.1)',
    text: '#60a5fa',
    badgeBg: 'rgba(59, 130, 246, 0.2)',
    emoji: '\u{1F3AF}',
    label: 'UX Issue',
  },
} as const

const fadeSlide = (delay: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
})

const fade = (delay: number) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { delay, duration: 0.4, ease: 'easeOut' as const },
})

export default function ClassificationCard({
  type,
  title,
  summary,
  evidence,
}: ClassificationCardProps) {
  const theme = themes[type]

  return (
    <motion.div
      initial={{ scale: 0.8, y: 20, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 24,
        mass: 0.8,
      }}
      style={{
        border: `1px solid ${theme.border}`,
        background: theme.bg,
        borderRadius: 12,
        padding: 16,
      }}
    >
      {/* Badge pill */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          delay: 0.2,
          type: 'spring',
          stiffness: 400,
          damping: 20,
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: theme.badgeBg,
          color: theme.text,
          borderRadius: 9999,
          padding: '4px 10px',
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 10,
        }}
      >
        <span>{theme.emoji}</span>
        <span>{theme.label}</span>
      </motion.div>

      {/* Title */}
      <motion.h3
        {...fadeSlide(0.3)}
        className="font-display"
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--color-chat-text)',
          margin: 0,
          marginBottom: 6,
        }}
      >
        {title}
      </motion.h3>

      {/* Summary */}
      <motion.p
        {...fade(0.4)}
        style={{
          fontSize: 13,
          lineHeight: 1.625,
          color: 'var(--color-chat-text-secondary)',
          margin: 0,
          marginBottom: 12,
        }}
      >
        {summary}
      </motion.p>

      {/* Evidence block */}
      <motion.div
        {...fade(0.5)}
        style={{
          background: 'rgba(28, 28, 26, 0.5)',
          borderRadius: 8,
          padding: 12,
          marginBottom: 12,
        }}
      >
        <p
          className="font-mono uppercase tracking-widest"
          style={{
            fontSize: 10,
            color: 'var(--color-chat-text-secondary)',
            margin: 0,
            marginBottom: 6,
          }}
        >
          Evidence
        </p>
        <p
          className="font-mono"
          style={{
            fontSize: 12,
            color: 'var(--color-chat-text)',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {evidence}
        </p>
      </motion.div>

      {/* Completion line */}
      <motion.div
        {...fade(0.8)}
        className="flex items-center gap-2"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            delay: 0.8,
            type: 'spring',
            stiffness: 500,
            damping: 25,
          }}
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </motion.div>
        <span
          style={{
            fontSize: 12,
            color: 'rgba(52, 211, 153, 0.8)',
          }}
        >
          Reported to the team — you won&apos;t have to explain this again.
        </span>
      </motion.div>
    </motion.div>
  )
}
