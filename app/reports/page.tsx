'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Report } from '@/lib/types'

const TYPE_CONFIG = {
  bug: { label: 'Bug', color: 'var(--color-bug)', bg: 'var(--color-bug-bg)' },
  edge_case: {
    label: 'Edge Case',
    color: 'var(--color-edge-case)',
    bg: 'var(--color-edge-case-bg)',
  },
  ux_issue: {
    label: 'UX Issue',
    color: 'var(--color-ux-issue)',
    bg: 'var(--color-ux-issue-bg)',
  },
} as const

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function poll() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_FDE_URL || 'http://localhost:8000'}/api/fde/reports`)
        if (res.ok && active) {
          setReports(await res.json())
        }
      } catch {
        // ignore fetch errors
      }
    }

    poll()
    const interval = setInterval(poll, 5000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  return (
    <div>
      <div className="mb-8">
        <h1
          className="font-display text-2xl font-medium text-text"
          style={{ letterSpacing: '0.04em' }}
        >
          Issue Reports
        </h1>
        <p className="mt-2 font-body text-sm text-text-tertiary">
          Classified by the Relay Engine agent
        </p>
      </div>

      {reports.length === 0 && (
        <div
          className="rounded-[var(--radius-lg)] border border-border-subtle bg-surface p-12 text-center"
        >
          <p className="font-body text-sm text-text-tertiary">
            No reports yet. Trigger an issue in the store to see one appear here.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <AnimatePresence initial={false}>
          {reports.map((report) => {
            const config = TYPE_CONFIG[report.type]
            const isExpanded = expandedId === report.id

            return (
              <motion.div
                key={report.id}
                layoutId={report.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                onClick={() =>
                  setExpandedId(isExpanded ? null : report.id)
                }
                className="cursor-pointer rounded-[var(--radius-lg)] border border-border bg-surface shadow-sm transition-shadow hover:shadow-md"
                style={{ overflow: 'hidden' }}
              >
                {/* Card header */}
                <div className="px-5 py-4">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: config.color,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      className="font-body text-xs font-medium"
                      style={{
                        color: config.color,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {config.label}
                    </span>
                    <span className="ml-auto font-mono text-xs text-text-tertiary">
                      {formatTime(report.createdAt)}
                    </span>
                  </div>
                  <h3 className="font-body text-sm font-medium text-text">
                    {report.title}
                  </h3>
                </div>

                {/* Expandable detail */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{
                        duration: 0.3,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div
                        className="px-5 pb-5"
                        style={{
                          borderTop: '1px solid var(--color-border-subtle)',
                          paddingTop: 16,
                        }}
                      >
                        <p className="font-body text-sm text-text-secondary mb-4">
                          {report.summary}
                        </p>

                        {report.evidence && (
                          <div className="mb-4">
                            <p
                              className="font-body text-xs font-medium text-text-tertiary mb-1.5"
                              style={{
                                letterSpacing: '0.04em',
                                textTransform: 'uppercase',
                              }}
                            >
                              Evidence
                            </p>
                            <div
                              className="font-mono"
                              style={{
                                fontSize: 12,
                                lineHeight: 1.6,
                                color: 'var(--color-text-secondary)',
                                background: 'var(--color-bg-subtle)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '12px 14px',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                              }}
                            >
                              {report.evidence}
                            </div>
                          </div>
                        )}

                        {report.elementContext && (
                          <div>
                            <p
                              className="font-body text-xs font-medium text-text-tertiary mb-1.5"
                              style={{
                                letterSpacing: '0.04em',
                                textTransform: 'uppercase',
                              }}
                            >
                              Element
                            </p>
                            <p
                              className="font-mono text-xs text-text-secondary"
                            >
                              {report.elementContext}
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
