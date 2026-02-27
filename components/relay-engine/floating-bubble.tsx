'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface FloatingBubbleProps {
  isReportMode: boolean
  hasError: boolean
  onClick: () => void
}

function ChatBubbleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function CrosshairIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="22" y1="12" x2="18" y2="12" />
      <line x1="6" y1="12" x2="2" y2="12" />
      <line x1="12" y1="6" x2="12" y2="2" />
      <line x1="12" y1="22" x2="12" y2="18" />
    </svg>
  )
}

export default function FloatingBubble({
  isReportMode,
  hasError,
  onClick,
}: FloatingBubbleProps) {
  const bgColor = hasError
    ? 'var(--color-bug)'
    : isReportMode
      ? 'var(--color-accent)'
      : 'var(--color-accent)'

  const ariaLabel = isReportMode
    ? 'Report mode active -- click to open support'
    : hasError
      ? 'Error detected -- click to open support'
      : 'Open support'

  return (
    <motion.button
      onClick={onClick}
      aria-label={ariaLabel}
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 22, mass: 1 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      className="fixed z-[9999] flex items-center justify-center"
      style={{
        bottom: 24,
        right: 24,
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: bgColor,
        color: '#F8F7F4',
        border: 'none',
        cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(45, 90, 61, 0.2)',
      }}
    >
      {/* Breathing pulse ring — elegant and slow */}
      <AnimatePresence>
        {!isReportMode && (
          <motion.div
            key="pulse"
            initial={{ opacity: 0, scale: 1 }}
            animate={{
              opacity: [0, 0.4, 0],
              scale: [1, 1.4, 1],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: hasError ? 2 : 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              position: 'absolute',
              inset: -6,
              borderRadius: '50%',
              background: hasError
                ? 'radial-gradient(circle, rgba(155, 59, 59, 0.3), transparent 70%)'
                : 'radial-gradient(circle, rgba(45, 90, 61, 0.2), transparent 70%)',
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      {/* Icon */}
      <AnimatePresence mode="wait">
        {isReportMode ? (
          <motion.span
            key="crosshair"
            initial={{ opacity: 0, rotate: -90 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 90 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center"
          >
            <CrosshairIcon />
          </motion.span>
        ) : (
          <motion.span
            key="chat"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center"
          >
            <ChatBubbleIcon />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
