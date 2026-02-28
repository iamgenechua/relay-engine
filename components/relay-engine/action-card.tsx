'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface ActionCardProps {
  toolName: string
  toolCallId: string
  input: Record<string, unknown>
  onApprove: (toolCallId: string, toolName: string, input: Record<string, unknown>) => void
  onDeny: (toolCallId: string) => void
}

const ACTION_LABELS: Record<string, (input: Record<string, unknown>) => string> = {
  getOrders: () => 'Look up all orders',
  getOrder: (input) => `Look up order ${input.orderId}`,
  getProducts: () => 'Check product inventory',
  updateOrderStatus: (input) => `Update ${input.orderId} to "${input.newStatus}"`,
  checkout: (input) => {
    const items = input.items as { productId: string; quantity: number }[]
    return `Create order with ${items?.length ?? 0} item${items?.length === 1 ? '' : 's'}`
  },
}

export default function ActionCard({
  toolName,
  toolCallId,
  input,
  onApprove,
  onDeny,
}: ActionCardProps) {
  const [status, setStatus] = useState<'pending' | 'approved' | 'denied' | 'executing'>('pending')

  const labelFn = ACTION_LABELS[toolName]
  const description = labelFn ? labelFn(input) : `Run ${toolName}`

  const handleApprove = () => {
    setStatus('executing')
    onApprove(toolCallId, toolName, input)
  }

  const handleDeny = () => {
    setStatus('denied')
    onDeny(toolCallId)
  }

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
      {/* Action label */}
      <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
        <span
          style={{
            display: 'block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: 'var(--color-accent)',
          }}
        />
        <span
          className="font-body"
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--color-accent)',
            letterSpacing: '0.03em',
          }}
        >
          Action Required
        </span>
      </div>

      {/* Description */}
      <p
        className="font-body"
        style={{
          fontSize: 13,
          lineHeight: 1.625,
          color: 'var(--color-text)',
          margin: 0,
          marginBottom: 14,
        }}
      >
        {description}
      </p>

      {/* Buttons or status */}
      {status === 'pending' && (
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            className="font-body"
            style={{
              fontSize: 12,
              fontWeight: 500,
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--color-accent)',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'opacity 0.15s ease',
            }}
          >
            Approve
          </button>
          <button
            onClick={handleDeny}
            className="font-body"
            style={{
              fontSize: 12,
              fontWeight: 500,
              padding: '6px 14px',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Deny
          </button>
        </div>
      )}

      {status === 'executing' && (
        <span className="font-body" style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
          Executing...
        </span>
      )}

      {status === 'denied' && (
        <span className="font-body" style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
          Declined by user.
        </span>
      )}
    </motion.div>
  )
}
