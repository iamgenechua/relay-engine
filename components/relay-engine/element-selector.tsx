'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

interface ElementSelectorProps {
  isActive: boolean
  onElementSelect: (context: {
    elementName: string
    cssSelector: string
    visibleText: string
    boundingBox: DOMRect
  }) => void
}

function getCssSelector(el: Element): string {
  const parts: string[] = []
  let current: Element | null = el
  let depth = 0

  while (current && depth < 3) {
    let selector = current.tagName.toLowerCase()

    if (current.id) {
      selector += `#${current.id}`
      parts.unshift(selector)
      break
    }

    const classes = Array.from(current.classList)
      .filter((c) => !c.startsWith('__') && c.length < 30)
      .slice(0, 2)

    if (classes.length > 0) {
      selector += '.' + classes.join('.')
    }

    parts.unshift(selector)
    current = current.parentElement
    depth++
  }

  return parts.join(' > ')
}

function getElementName(el: Element): string {
  // Check for aria-label first
  const ariaLabel = el.getAttribute('aria-label')
  if (ariaLabel) return ariaLabel

  // Check for role
  const role = el.getAttribute('role')
  if (role) return `${role} (${el.tagName.toLowerCase()})`

  // Check for common attributes
  const title = el.getAttribute('title')
  if (title) return title

  const placeholder = el.getAttribute('placeholder')
  if (placeholder) return placeholder

  // Use tag name + truncated text content
  const text = el.textContent?.trim() || ''
  const tag = el.tagName.toLowerCase()

  if (text.length > 0) {
    const truncated = text.length > 40 ? text.slice(0, 40) + '...' : text
    return `<${tag}> ${truncated}`
  }

  return `<${tag}>`
}

function isInsideRelayEngine(el: Element): boolean {
  let current: Element | null = el
  while (current) {
    if (current.hasAttribute('data-relay-engine')) return true
    current = current.parentElement
  }
  return false
}

export default function ElementSelector({
  isActive,
  onElementSelect,
}: ElementSelectorProps) {
  const [highlight, setHighlight] = useState<{
    rect: DOMRect
    name: string
  } | null>(null)

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const el = document.elementFromPoint(e.clientX, e.clientY)
    if (!el || isInsideRelayEngine(el)) {
      setHighlight(null)
      return
    }

    const rect = el.getBoundingClientRect()
    const name = getElementName(el)
    setHighlight({ rect, name })
  }, [])

  const handleClick = useCallback(
    (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const el = document.elementFromPoint(e.clientX, e.clientY)
      if (!el || isInsideRelayEngine(el)) return

      const rect = el.getBoundingClientRect()
      const name = getElementName(el)
      const selector = getCssSelector(el)
      const text = (el.textContent || '').trim().slice(0, 200)

      onElementSelect({
        elementName: name,
        cssSelector: selector,
        visibleText: text,
        boundingBox: rect,
      })
    },
    [onElementSelect]
  )

  useEffect(() => {
    if (!isActive) {
      setHighlight(null)
      return
    }

    document.body.style.cursor = 'crosshair'
    document.addEventListener('mousemove', handleMouseMove, true)
    document.addEventListener('click', handleClick, true)

    return () => {
      document.body.style.cursor = ''
      document.removeEventListener('mousemove', handleMouseMove, true)
      document.removeEventListener('click', handleClick, true)
      setHighlight(null)
    }
  }, [isActive, handleMouseMove, handleClick])

  if (typeof window === 'undefined') return null

  return createPortal(
    <>
      {/* Mode indicator banner */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            key="selector-banner"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
            style={{
              position: 'fixed',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10000,
              background: 'var(--color-chat-bg)',
              color: 'var(--color-accent)',
              fontSize: 13,
              fontWeight: 500,
              padding: '8px 20px',
              borderRadius: 9999,
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--color-chat-border)',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            Click an element to report an issue
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover highlight overlay */}
      <AnimatePresence>
        {isActive && highlight && (
          <motion.div
            key="highlight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            style={{
              position: 'fixed',
              top: highlight.rect.top,
              left: highlight.rect.left,
              width: highlight.rect.width,
              height: highlight.rect.height,
              zIndex: 9997,
              border: '2px solid var(--color-accent)',
              background: 'rgba(13, 148, 136, 0.08)',
              borderRadius: 4,
              pointerEvents: 'none',
            }}
          >
            {/* Element name tooltip */}
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: 4,
                background: 'var(--color-chat-bg)',
                color: 'var(--color-chat-text)',
                fontSize: 11,
                fontFamily: 'var(--font-mono), monospace',
                padding: '3px 8px',
                borderRadius: 4,
                whiteSpace: 'nowrap',
                maxWidth: 300,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                pointerEvents: 'none',
              }}
            >
              {highlight.name}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body
  )
}
