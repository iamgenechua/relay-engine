'use client'

import { useState } from 'react'
import FloatingPanel from './floating-panel'
import ChatPanel from './chat-panel'
import type { RelayChatMessage } from './chat-panel'

export default function RelayLauncher() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<RelayChatMessage[]>([])
  const [isSending, setIsSending] = useState(false)

  const handleSend = async (messageText: string) => {
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
