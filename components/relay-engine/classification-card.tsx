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
    color: 'var(--color-bug)',
    bg: 'var(--color-bug-bg)',
    label: 'Bug',
  },
  edge_case: {
    color: 'var(--color-edge-case)',
    bg: 'var(--color-edge-case-bg)',
    label: 'Edge Case',
  },
  ux_issue: {
    color: 'var(--color-ux-issue)',
    bg: 'var(--color-ux-issue-bg)',
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
        background: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 14,
        padding: 18,
      }}
    >
      {/* Type label with dot */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="flex items-center gap-2"
        style={{ marginBottom: 12 }}
      >
        <span
          style={{
            display: 'block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: theme.color,
          }}
        />
        <span
          className="font-body"
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: theme.color,
            letterSpacing: '0.03em',
          }}
        >
          {theme.label}
        </span>
      </motion.div>

      {/* Title */}
      <motion.h3
        {...fadeSlide(0.3)}
        className="font-display"
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--color-text)',
          margin: 0,
          marginBottom: 6,
        }}
      >
        {title}
      </motion.h3>

      {/* Summary */}
      <motion.p
        {...fade(0.4)}
        className="font-body"
        style={{
          fontSize: 13,
          lineHeight: 1.625,
          color: 'var(--color-text-secondary)',
          margin: 0,
          marginBottom: 14,
        }}
      >
        {summary}
      </motion.p>

      {/* Evidence block */}
      <motion.div
        {...fade(0.5)}
        style={{
          background: 'var(--color-bg-subtle)',
          borderRadius: 8,
          padding: 12,
          marginBottom: 14,
          border: '1px solid var(--color-border-subtle)',
        }}
      >
        <p
          className="font-mono uppercase tracking-widest"
          style={{
            fontSize: 10,
            color: 'var(--color-text-tertiary)',
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
            color: 'var(--color-text)',
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
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: 'var(--color-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg
            width="9"
            height="9"
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
          className="font-body"
          style={{
            fontSize: 12,
            color: 'var(--color-text-tertiary)',
          }}
        >
          Reported to the team. You won&apos;t have to explain this again.
        </span>
      </motion.div>
    </motion.div>
  )
}
