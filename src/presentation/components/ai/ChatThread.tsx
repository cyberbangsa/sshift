import { useEffect, useRef } from 'react'
import type { AIMessage } from '@/domain/entities'
import { MessageBubble } from './MessageBubble'

interface ChatThreadProps {
  messages: AIMessage[]
  isStreaming: boolean
}

export function ChatThread({ messages, isStreaming }: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' })
  }, [messages.length])

  return (
    <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 gap-2 py-8">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#a8e8ff22" stroke="#a8e8ff44" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <span
            className="text-[0.6rem] text-center"
            style={{ color: '#56687a', fontFamily: "'Inter', sans-serif", maxWidth: 160, lineHeight: 1.6 }}
          >
            Ask the AI about your session, errors, or commands
          </span>
        </div>
      )}
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {isStreaming && (
        <div className="flex justify-start gap-2.5">
          <div
            className="w-6 h-6 rounded shrink-0 flex items-center justify-center"
            style={{ background: 'rgba(168,232,255,0.1)', border: '1px solid rgba(168,232,255,0.25)' }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#a8e8ff" stroke="#a8e8ff" strokeWidth="1">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div className="flex items-center gap-1 px-3 py-2 rounded" style={{ background: '#1d2126' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#56687a' }} />
            <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.2s]" style={{ background: '#56687a' }} />
            <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.4s]" style={{ background: '#56687a' }} />
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
