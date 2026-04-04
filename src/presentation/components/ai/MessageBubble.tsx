import { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import type { AIMessage } from '@/domain/entities'

// ── Custom code theme to match app palette ────────────────────────────────────
const codeTheme: Record<string, React.CSSProperties> = {
  'code[class*="language-"]': { color: '#a8e8ff', background: 'none', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: '0.6875rem', lineHeight: '1.5' },
  'pre[class*="language-"]': { color: '#a8e8ff', background: '#161a1e', padding: '0', margin: '0', overflow: 'auto', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: '0.6875rem', lineHeight: '1.5' },
  comment: { color: '#56687a', fontStyle: 'italic' },
  prolog: { color: '#56687a' },
  doctype: { color: '#56687a' },
  cdata: { color: '#56687a' },
  punctuation: { color: '#8a9bb0' },
  property: { color: '#a8e8ff' },
  tag: { color: '#a8e8ff' },
  boolean: { color: '#ff8c69' },
  number: { color: '#ff8c69' },
  constant: { color: '#ff8c69' },
  symbol: { color: '#ff8c69' },
  selector: { color: '#7dd3fc' },
  'attr-name': { color: '#7dd3fc' },
  string: { color: '#86efac' },
  char: { color: '#86efac' },
  builtin: { color: '#86efac' },
  operator: { color: '#8a9bb0' },
  entity: { color: '#a8e8ff', cursor: 'help' },
  url: { color: '#86efac' },
  keyword: { color: '#c084fc' },
  function: { color: '#60a5fa' },
  regex: { color: '#fbbf24' },
  important: { color: '#fbbf24', fontWeight: 'bold' },
  variable: { color: '#e2e2e6' },
  'class-name': { color: '#60a5fa' },
  'attr-value': { color: '#86efac' },
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Segment = { type: 'text'; value: string } | { type: 'code'; lang: string; value: string }

const RUNNABLE_LANGS = new Set(['bash', 'sh', 'shell', 'zsh', 'fish', 'console', ''])

// ── Content parser ────────────────────────────────────────────────────────────

const FENCE_RE = /```(\w*)\n?([\s\S]*?)```/g

function parseContent(content: string): Segment[] {
  const segments: Segment[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  FENCE_RE.lastIndex = 0
  while ((match = FENCE_RE.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim()
      if (text) segments.push({ type: 'text', value: text })
    }
    segments.push({ type: 'code', lang: match[1] ?? '', value: match[2].trim() })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim()
    if (text) segments.push({ type: 'text', value: text })
  }

  return segments.length > 0 ? segments : [{ type: 'text', value: content }]
}

// ── CodeBlock ─────────────────────────────────────────────────────────────────

interface CodeBlockProps {
  lang: string
  code: string
  onRunCommand?: (cmd: string) => void
  isExecuted?: boolean
}

function CodeBlock({ lang, code, onRunCommand, isExecuted }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const isRunnable = RUNNABLE_LANGS.has(lang.toLowerCase())
  const displayLang = lang || 'text'

  const handleCopy = () => {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="rounded my-2 overflow-hidden" style={{ border: '1px solid #252a30' }}>
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{ background: '#0c0e11', borderBottom: '1px solid #1d2126' }}
      >
        <span
          className="text-[0.55rem] font-mono font-semibold uppercase tracking-[0.1em]"
          style={{ color: '#56687a' }}
        >
          {displayLang}
        </span>
        <div className="flex items-center gap-1.5">
          {isRunnable && isExecuted && (
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[0.6rem] font-semibold"
              style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', fontFamily: "'Inter', sans-serif" }}
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Executed
            </span>
          )}
          {isRunnable && !isExecuted && onRunCommand && (
            <button
              onClick={() => onRunCommand(code)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[0.6rem] font-semibold transition-colors"
              style={{ background: 'rgba(168,232,255,0.08)', border: '1px solid rgba(168,232,255,0.2)', color: '#a8e8ff', fontFamily: "'Inter', sans-serif" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(168,232,255,0.15)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(168,232,255,0.08)' }}
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="#a8e8ff" stroke="none">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Run
            </button>
          )}
          <button
            onClick={handleCopy}
            className="p-1 rounded transition-colors"
            style={{ color: copied ? '#22c55e' : '#56687a' }}
            aria-label="Copy code"
            title="Copy"
          >
            {copied ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
        </div>
      </div>
      {/* Code body */}
      <div className="px-3 py-2 overflow-x-auto" style={{ background: '#161a1e' }}>
        <SyntaxHighlighter
          language={displayLang === 'text' ? 'plaintext' : displayLang}
          style={codeTheme}
          PreTag="div"
          CodeTag="code"
          customStyle={{ margin: 0, padding: 0, background: 'transparent', fontSize: '0.6875rem', lineHeight: 1.5 }}
          codeTagProps={{ style: { fontFamily: "'JetBrains Mono', 'Fira Code', monospace" } }}
          wrapLongLines={false}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}

// ── MessageBubble ─────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: AIMessage
  onRunCommand?: (cmd: string) => void
  executionMode?: 'manual' | 'auto'
}

export function MessageBubble({ message, onRunCommand, executionMode = 'manual' }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const segments = parseContent(message.content)

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[85%] px-3 py-2 rounded"
          style={{ background: 'rgba(168,232,255,0.12)', border: '1px solid rgba(168,232,255,0.2)' }}
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

  /* ── Assistant message ──────────────────────────────────────────── */
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
          seg.type === 'code' ? (
            <CodeBlock
              key={i}
              lang={seg.lang}
              code={seg.value}
              onRunCommand={onRunCommand}
              isExecuted={executionMode === 'auto' && RUNNABLE_LANGS.has(seg.lang.toLowerCase())}
            />
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

        {/* commandExecuted — from <run>...</run> tags AI emitted */}
        {message.commandExecuted && (
          <CodeBlock
            lang="bash"
            code={message.commandExecuted}
            onRunCommand={onRunCommand}
            isExecuted={executionMode === 'auto'}
          />
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
