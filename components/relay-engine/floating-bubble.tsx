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
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
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
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
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
  const gradient = hasError
    ? 'linear-gradient(135deg, #DC2626, #EF4444)'
    : isReportMode
      ? 'linear-gradient(135deg, #0F766E, #0D9488)'
      : 'linear-gradient(135deg, #1C1C1A, #2A2A27)'

  const pulseGradient = hasError
    ? 'radial-gradient(circle, rgba(220, 38, 38, 0.4), rgba(239, 68, 68, 0) 70%)'
    : 'radial-gradient(circle, rgba(13, 148, 136, 0.3), rgba(13, 148, 136, 0) 70%)'

  const pulseDuration = hasError ? 1.5 : 3

  const ariaLabel = isReportMode
    ? 'Report mode active — click to open Relay Engine'
    : hasError
      ? 'Error detected — click to open Relay Engine'
      : 'Open Relay Engine'

  return (
    <motion.button
      onClick={onClick}
      aria-label={ariaLabel}
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, mass: 1 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      className="fixed z-[9999] flex items-center justify-center"
      style={{
        bottom: 24,
        right: 24,
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: gradient,
        color: '#F0EFEC',
        border: 'none',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-bubble)',
      }}
    >
      {/* Breathing pulse ring */}
      <AnimatePresence>
        {!isReportMode && (
          <motion.div
            key="pulse"
            initial={{ opacity: 0, scale: 1 }}
            animate={{
              opacity: [0, 0.6, 0],
              scale: [1, 1.5, 1],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: pulseDuration,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              position: 'absolute',
              inset: -8,
              borderRadius: '50%',
              background: pulseGradient,
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
