import { useState } from 'react'
import type { AIMessage, AIRule } from '@/domain/entities'
import type { ExecutionMode } from '@/application/stores'
import { ChatThread } from './ChatThread'
import { HostRulesPanel } from './HostRulesPanel'

interface AIPanelProps {
  messages: AIMessage[]
  isStreaming: boolean
  error: string | null
  onSendMessage: (message: string) => void
  onClearChat: () => void
  onAbort?: () => void
  onRunCommand?: (cmd: string) => void
  executionMode?: ExecutionMode
  onSetExecutionMode?: (mode: ExecutionMode) => void
  hostRules?: AIRule[]
  onUpdateHostRules?: (rules: AIRule[]) => void
}

export function AIPanel({
  messages,
  isStreaming,
  error,
  onSendMessage,
  onClearChat,
  onAbort,
  onRunCommand,
  executionMode = 'manual',
  onSetExecutionMode,
  hostRules = [],
  onUpdateHostRules,
}: AIPanelProps) {
  const [input, setInput] = useState('')
  const [rulesOpen, setRulesOpen] = useState(false)
  const isAutoMode = executionMode === 'auto'

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return
    onSendMessage(trimmed)
    setInput('')
  }

  const handleStop = () => {
    onAbort?.()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#111317' }}>
      {/* ── Header ──────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-3 py-2.5 shrink-0"
        style={{ borderBottom: '1px solid #1d2126' }}
      >
        <div className="flex items-center gap-2">
          {/* Lightning bolt icon */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="#a8e8ff"
            stroke="#a8e8ff"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <span
            className="text-[0.6875rem] font-bold tracking-[0.12em] uppercase"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#e2e2e6' }}
          >
            Shift AI Agent
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Status dot */}
          <span className="w-2 h-2 rounded-full" style={{ background: '#22c55e' }} />
          {/* Rules button */}
          <button
            onClick={() => setRulesOpen((v) => !v)}
            className="relative p-1 rounded hover:bg-white/5 transition-colors"
            aria-label="Host AI rules"
            title="Host AI Rules"
            style={{ color: rulesOpen ? '#a8e8ff' : '#56687a' }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            {hostRules.length > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full text-[0.45rem] font-bold"
                style={{
                  background: '#a8e8ff',
                  color: '#0c0e11',
                  width: 12,
                  height: 12,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {hostRules.length}
              </span>
            )}
          </button>
          {/* Clear button */}
          <button
            onClick={onClearChat}
            className="p-1 rounded hover:bg-white/5 transition-colors"
            aria-label="Clear chat"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#56687a"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>
      </div>
      {/* ── Rules drawer ────────────────────────────────────── */}
      {rulesOpen && (
        <div
          className="flex flex-col shrink-0 overflow-y-auto"
          style={{ maxHeight: '55%', borderBottom: '1px solid #1d2126', background: '#0f1215' }}
        >
          <div
            className="flex items-center justify-between px-3 py-2 shrink-0"
            style={{ borderBottom: '1px solid #1d2126' }}
          >
            <span
              className="text-[0.6rem] font-bold tracking-widest uppercase"
              style={{ color: '#56687a', fontFamily: "'Inter', sans-serif" }}
            >
              Host AI Rules
            </span>
            <button
              onClick={() => setRulesOpen(false)}
              className="p-0.5 rounded hover:bg-white/5 transition-colors"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#56687a"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="px-3 py-2">
            <HostRulesPanel rules={hostRules} onChange={(rules) => onUpdateHostRules?.(rules)} />
          </div>
        </div>
      )}
      {/* ── Thread ──────────────────────────────────────────── */}
      <ChatThread
        messages={messages}
        isStreaming={isStreaming}
        onRunCommand={onRunCommand}
        executionMode={executionMode}
      />

      {/* Auto-mode warning banner */}
      {isAutoMode && (
        <div
          className="px-3 py-1.5 shrink-0 flex items-center gap-1.5 text-[0.6rem]"
          style={{
            background: 'rgba(251,191,36,0.06)',
            borderTop: '1px solid rgba(251,191,36,0.15)',
            color: '#fbbf24',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Auto mode: AI can run commands directly
        </div>
      )}

      {error && (
        <div
          className="px-3 py-2 text-[0.6875rem] shrink-0"
          style={{
            color: '#ef4444',
            background: 'rgba(239,68,68,0.08)',
            borderTop: '1px solid rgba(239,68,68,0.2)',
          }}
        >
          {error}
        </div>
      )}

      {/* ── Input ───────────────────────────────────────────── */}
      <div
        className="px-3 pt-2 pb-3 shrink-0 flex flex-col gap-1.5"
        style={{ borderTop: '1px solid #1d2126' }}
      >
        {/* Mode toggle row */}
        <div className="flex items-center gap-1">
          <div
            className="flex items-center rounded overflow-hidden text-[0.55rem] font-semibold"
            style={{ border: '1px solid #252a30', fontFamily: "'Inter', sans-serif" }}
          >
            <button
              onClick={() => onSetExecutionMode?.('manual')}
              className="px-2 py-0.5 transition-colors"
              style={{
                background: !isAutoMode ? 'rgba(168,232,255,0.12)' : 'transparent',
                color: !isAutoMode ? '#a8e8ff' : '#56687a',
              }}
            >
              Manual
            </button>
            <button
              onClick={() => onSetExecutionMode?.('auto')}
              className="px-2 py-0.5 transition-colors"
              style={{
                background: isAutoMode ? 'rgba(251,191,36,0.12)' : 'transparent',
                color: isAutoMode ? '#fbbf24' : '#56687a',
              }}
            >
              Auto
            </button>
          </div>
        </div>
        {/* Text field row */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded"
          style={{ background: '#161a1e', border: '1px solid #252a30' }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? 'AI is thinking…' : 'Ask AI about this session…'}
            disabled={isStreaming}
            className="flex-1 bg-transparent outline-none text-text-primary placeholder:text-text-muted"
            style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.6875rem' }}
          />
          {isStreaming ? (
            <button
              onClick={handleStop}
              className="shrink-0 p-1 rounded transition-all"
              style={{ color: '#ef4444' }}
              aria-label="Stop AI"
              title="Stop"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#ef4444" stroke="none">
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="shrink-0 p-1 rounded transition-opacity"
              style={{ opacity: !input.trim() ? 0.3 : 1 }}
              aria-label="Send message"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#a8e8ff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
