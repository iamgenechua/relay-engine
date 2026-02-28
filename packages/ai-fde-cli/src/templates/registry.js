import path from 'node:path'
import fs from 'node:fs'

function tsOrJsExtension(useTypeScript) {
  return useTypeScript ? 'tsx' : 'jsx'
}

function floatingPanelSource(useTypeScript) {
  const typing = useTypeScript
    ? `
interface FloatingPanelProps {
  isOpen: boolean
  hasError?: boolean
  onToggle: () => void
  ariaLabel?: string
}
`
    : ''
  const propsType = useTypeScript ? ': FloatingPanelProps' : ''

  return `'use client'

${typing}

export default function FloatingPanel({
  isOpen,
  hasError = false,
  onToggle,
  ariaLabel,
}${propsType}) {
  const label = ariaLabel || (isOpen ? 'Close support panel' : 'Open support panel')

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onToggle}
      style={{
        position: 'fixed',
        right: 24,
        bottom: 24,
        zIndex: 9999,
        width: 48,
        height: 48,
        borderRadius: 999,
        border: 'none',
        background: hasError ? '#a52e2e' : '#1f6f4a',
        color: '#fff',
        fontSize: 20,
        cursor: 'pointer',
        boxShadow: '0 10px 24px rgba(0,0,0,0.18)',
      }}
    >
      {isOpen ? '×' : '💬'}
    </button>
  )
}
`
}

function chatPanelSource(useTypeScript) {
  const typing = useTypeScript
    ? `
export interface RelayChatMessage {
  id?: string
  role: 'user' | 'assistant'
  content: string
}

interface ChatPanelProps {
  isOpen: boolean
  title?: string
  isSending?: boolean
  messages: RelayChatMessage[]
  onSend: (message: string) => void
  onClose: () => void
}
`
    : ''

  const stateType = useTypeScript ? 'useState<string>' : 'useState'
  const propsType = useTypeScript ? ': ChatPanelProps' : ''
  const reactTypeImports = useTypeScript ? ', type FormEvent, type ChangeEvent' : ''
  const submitType = useTypeScript ? ': FormEvent<HTMLFormElement>' : ''
  const changeEventType = useTypeScript ? ': ChangeEvent<HTMLTextAreaElement>' : ''

  return `'use client'

import { useState${reactTypeImports} } from 'react'
${typing}

export default function ChatPanel({
  isOpen,
  title = 'Support Assistant',
  isSending = false,
  messages,
  onSend,
  onClose,
}${propsType}) {
  const [value, setValue] = ${stateType}('')

  const handleSubmit = (event${submitType}) => {
    event.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || isSending) return

    onSend(trimmed)
    setValue('')
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        right: 24,
        bottom: 84,
        width: 'min(420px, calc(100vw - 24px))',
        height: 520,
        zIndex: 9998,
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.12)',
        background: '#ffffff',
        boxShadow: '0 14px 34px rgba(0,0,0,0.16)',
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        <strong style={{ fontSize: 14 }}>{title}</strong>
        <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
          Close
        </button>
      </header>

      <div style={{ overflowY: 'auto', padding: 12, display: 'grid', gap: 8 }}>
        {messages.length === 0 ? (
          <div style={{ color: '#6b7280', fontSize: 14 }}>Ask what happened in your app session.</div>
        ) : (
          messages.map((message, index) => (
            <div
              key={message.id || index}
              style={{
                justifySelf: message.role === 'user' ? 'end' : 'start',
                maxWidth: '82%',
                borderRadius: 10,
                padding: '8px 10px',
                fontSize: 14,
                lineHeight: 1.45,
                background: message.role === 'user' ? '#1f6f4a' : '#f3f4f6',
                color: message.role === 'user' ? '#fff' : '#111827',
              }}
            >
              {message.content}
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ borderTop: '1px solid rgba(0,0,0,0.08)', padding: 10, display: 'grid', gap: 8 }}>
        <textarea
          value={value}
          onChange={(event${changeEventType}) => setValue(event.target.value)}
          rows={3}
          placeholder="Explain the issue..."
          style={{ width: '100%', resize: 'none', borderRadius: 8, border: '1px solid #d1d5db', padding: 8, fontSize: 14 }}
        />
        <button
          type="submit"
          disabled={isSending || !value.trim()}
          style={{
            justifySelf: 'end',
            border: 'none',
            borderRadius: 8,
            padding: '8px 12px',
            background: '#1f6f4a',
            color: '#fff',
            cursor: isSending || !value.trim() ? 'not-allowed' : 'pointer',
            opacity: isSending || !value.trim() ? 0.7 : 1,
          }}
        >
          {isSending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  )
}
`
}

function launcherSource(useTypeScript) {
  const typeImports = useTypeScript
    ? `import type { RelayChatMessage } from './chat-panel'\n`
    : ''
  const messagesStateType = useTypeScript ? '<RelayChatMessage[]>' : ''
  const sendType = useTypeScript ? ': string' : ''

  return `'use client'

import { useState } from 'react'
import FloatingPanel from './floating-panel'
import ChatPanel from './chat-panel'
${typeImports}
export default function RelayLauncher() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState${messagesStateType}([])
  const [isSending, setIsSending] = useState(false)

  const handleSend = async (messageText${sendType}) => {
    setMessages((prev) => [...prev, { role: 'user', content: messageText }])
    setIsSending(true)

    // Replace this placeholder with your /api/fde/stream or chat endpoint.
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Connected. Wire this to your Relay endpoint next.' },
      ])
      setIsSending(false)
    }, 350)
  }

  return (
    <>
      <FloatingPanel isOpen={isOpen} onToggle={() => setIsOpen((prev) => !prev)} />
      <ChatPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        messages={messages}
        isSending={isSending}
        onSend={handleSend}
      />
    </>
  )
}
`
}

export function getComponentRegistry(useTypeScript) {
  const ext = tsOrJsExtension(useTypeScript)

  return {
    'floating-panel': {
      name: 'floating-panel',
      description: 'Floating launcher bubble for the support assistant.',
      files: [{ relativePath: `relay-engine/floating-panel.${ext}`, source: floatingPanelSource(useTypeScript) }],
      dependencies: [],
    },
    'chat-panel': {
      name: 'chat-panel',
      description: 'Chat panel UI for collecting user feedback and messaging.',
      files: [{ relativePath: `relay-engine/chat-panel.${ext}`, source: chatPanelSource(useTypeScript) }],
      dependencies: [],
    },
    launcher: {
      name: 'launcher',
      description: 'Composes the floating panel and chat panel into one widget.',
      files: [{ relativePath: `relay-engine/relay-launcher.${ext}`, source: launcherSource(useTypeScript) }],
      dependencies: ['chat-panel', 'floating-panel'],
    },
  }
}

export function resolveComponents(requested, registry) {
  const queue = [...requested]
  const out = []
  const seen = new Set()

  while (queue.length > 0) {
    const key = queue.shift()
    const item = registry[key]
    if (!item) continue
    if (seen.has(key)) continue
    seen.add(key)

    for (const dep of item.dependencies || []) {
      queue.unshift(dep)
    }
    out.push(item)
  }

  return out
}

export function defaultComponentInstallDir(frontendDir) {
  const srcComponents = path.join(frontendDir, 'src', 'components')
  if (pathExists(srcComponents)) return srcComponents

  const components = path.join(frontendDir, 'components')
  if (pathExists(components)) return components

  return components
}

function pathExists(absolutePath) {
  try {
    return !!absolutePath && absolutePath.length > 0 && fs.existsSync(absolutePath)
  } catch {
    return false
  }
}
