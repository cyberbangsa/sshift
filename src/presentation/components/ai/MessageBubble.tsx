import type { AIMessage } from '@/domain/entities'

interface MessageBubbleProps {
  message: AIMessage
}

/**
 * Splits message content into plain paragraphs and blockquote segments.
 * Lines wrapped in \"...\" (a line starting with a double-quote) are rendered
 * as a styled blockquote block.
 */
function parseContent(content: string): { type: 'text' | 'quote'; value: string }[] {
  const segments: { type: 'text' | 'quote'; value: string }[] = []
  let textAcc = ''

  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length > 2) {
      if (textAcc.trim()) {
        segments.push({ type: 'text', value: textAcc.trim() })
        textAcc = ''
      }
      segments.push({ type: 'quote', value: trimmed.slice(1, -1) })
    } else {
      textAcc += (textAcc ? '\n' : '') + line
    }
  }
  if (textAcc.trim()) segments.push({ type: 'text', value: textAcc.trim() })
  return segments
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser   = message.role === 'user'
  const segments = parseContent(message.content)

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[85%] px-3 py-2 rounded"
          style={{
            background: 'rgba(168,232,255,0.12)',
            border: '1px solid rgba(168,232,255,0.2)',
            borderRadius: '4px',
          }}
        >
          <p
            className="text-[0.6875rem] whitespace-pre-wrap break-words"
            style={{ color: '#e2e2e6', fontFamily: "'Inter', sans-serif" }}
          >
            {message.content}
          </p>
        </div>
      </div>
    )
  }

  /* ── Assistant message ──────────────────────────────────────── */
  return (
    <div className="flex gap-2.5">
      {/* Avatar */}
      <div
        className="w-6 h-6 rounded shrink-0 flex items-center justify-center mt-0.5"
        style={{ background: 'rgba(168,232,255,0.1)', border: '1px solid rgba(168,232,255,0.25)' }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="#a8e8ff" stroke="#a8e8ff" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {segments.map((seg, i) =>
          seg.type === 'quote' ? (
            <div
              key={i}
              className="rounded px-3 py-2 my-1.5"
              style={{ background: '#1d2126', borderLeft: '2px solid rgba(168,232,255,0.4)' }}
            >
              <p
                className="text-[0.6375rem] italic"
                style={{ color: '#8a9bb0', fontFamily: "'Inter', sans-serif", lineHeight: 1.6 }}
              >
                {seg.value}
              </p>
            </div>
          ) : (
            <p
              key={i}
              className="text-[0.6875rem] whitespace-pre-wrap break-words"
              style={{ color: '#e2e2e6', fontFamily: "'Inter', sans-serif", lineHeight: 1.6 }}
            >
              {seg.value}
            </p>
          ),
        )}

        {/* EXECUTED IN TERMINAL badge */}
        {message.commandExecuted && (
          <div
            className="flex items-center gap-2 mt-2 px-2.5 py-1.5 rounded"
            style={{
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: '4px',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span
              className="text-[0.55rem] font-bold tracking-[0.12em] uppercase"
              style={{ color: '#56687a', fontFamily: "'Inter', sans-serif" }}
            >
              Executed in terminal
            </span>
            <span
              className="text-[0.6rem] font-mono ml-1"
              style={{ color: '#a8e8ff' }}
            >
              {message.commandExecuted}
            </span>
          </div>
        )}

        {message.commandOutput && (
          <pre
            className="mt-1 text-[0.625rem] font-mono whitespace-pre-wrap rounded px-2 py-1.5"
            style={{ color: '#8a9bb0', background: '#161a1e', border: '1px solid #1d2126' }}
          >
            {message.commandOutput}
          </pre>
        )}
      </div>
    </div>
  )
}
