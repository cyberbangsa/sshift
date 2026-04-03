import type { Session } from '@/domain/entities'
import { Icon } from '@/presentation/shared'

interface TerminalTabProps {
  sessions: Session[]
  activeSessionId: string | null
  onSelectSession: (id: string) => void
  onCloseSession: (id: string) => void
}

export function TerminalTab({
  sessions,
  activeSessionId,
  onSelectSession,
  onCloseSession,
}: TerminalTabProps) {
  if (sessions.length === 0) {
    return null
  }

  return (
    <div className="flex items-center border-b border-border-default bg-surface-secondary overflow-x-auto">
      {sessions.map((session) => (
        <div
          key={session.id}
          className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer border-r border-border-default transition-colors
            ${session.id === activeSessionId
              ? 'bg-surface-primary text-text-primary'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-tertiary/30'
            }`}
          onClick={() => onSelectSession(session.id)}
          role="tab"
          aria-selected={session.id === activeSessionId}
        >
          <Icon name="terminal" size={12} />
          <span className="whitespace-nowrap">{session.hostId}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCloseSession(session.id)
            }}
            className="ml-1 opacity-50 hover:opacity-100 transition-opacity"
            aria-label="Close session"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
