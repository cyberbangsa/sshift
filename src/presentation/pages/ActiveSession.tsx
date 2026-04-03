import { useRef } from 'react'
import { useSessionStore, useHostStore, useUIStore } from '@/application/stores'
import { TerminalPane } from '@/presentation/components/terminal'
import type { TerminalPaneHandle } from '@/presentation/components/terminal'

type ContentTab = 'terminal' | 'explorer' | 'transfers'

interface ActiveSessionProps {
  sessionId: string
  onClosed?: (exitCode: number) => void
}

const CONTENT_TABS: { id: ContentTab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'terminal',
    label: 'Terminal',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    ),
  },
  {
    id: 'explorer',
    label: 'File Explorer',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: 'transfers',
    label: 'Transfers',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
      </svg>
    ),
  },
]

export function ActiveSession({ sessionId, onClosed }: ActiveSessionProps) {
  const { sessions } = useSessionStore()
  const { hosts }    = useHostStore()
  const { activeTab, setActiveTab } = useUIStore()
  const terminalRef  = useRef<TerminalPaneHandle>(null)

  const activeSession = sessions.get(sessionId)
  const activeHost    = activeSession ? hosts.find((h) => h.id === activeSession.hostId) : null

  return (
    <div className="flex flex-col h-full" style={{ background: '#111317' }}>
      {/* ── Content tab bar ─────────────────────────────────── */}
      <div
        className="flex items-center shrink-0"
        style={{ borderBottom: '1px solid #1d2126', background: '#111317' }}
      >
        {CONTENT_TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-[0.75rem] font-medium transition-colors"
              style={{
                color: isActive ? '#a8e8ff' : '#8a9bb0',
                borderBottom: isActive ? '2px solid #a8e8ff' : '2px solid transparent',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <span style={{ color: isActive ? '#a8e8ff' : '#56687a' }}>{tab.icon}</span>
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Content area ────────────────────────────────────── */}
      <div className="flex-1 min-h-0">
        {activeTab === 'terminal' && activeSession && (
          <TerminalPane
            ref={terminalRef}
            sessionId={activeSession.id}
            onClosed={onClosed}
          />
        )}
        {activeTab === 'terminal' && !activeSession && (
          <div className="flex items-center justify-center h-full" style={{ color: '#56687a', fontSize: '0.75rem' }}>
            Select a session to view terminal
          </div>
        )}
        {activeTab === 'explorer' && (
          <div className="flex items-center justify-center h-full" style={{ color: '#56687a', fontSize: '0.75rem' }}>
            File Explorer — coming soon
          </div>
        )}
        {activeTab === 'transfers' && (
          <div className="flex items-center justify-center h-full" style={{ color: '#56687a', fontSize: '0.75rem' }}>
            Transfer Queue — coming soon
          </div>
        )}
      </div>

      {/* ── Bottom status bar ───────────────────────────────── */}
      <div
        className="flex items-center gap-0 shrink-0 overflow-x-auto"
        style={{ background: '#0c0e11', borderTop: '1px solid #1d2126', height: 28 }}
      >
        {/* Connection */}
        <StatusItem>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e', display: 'inline-block' }} />
          <span style={{ color: '#a8e8ff' }}>
            {activeHost?.label?.toUpperCase() ?? 'PRODUCTION DB'}
          </span>
        </StatusItem>
        <StatusSep />
        {/* Latency */}
        <StatusItem>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#56687a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span>{activeSession?.latencyMs != null ? `${activeSession.latencyMs}ms` : '12ns'}</span>
        </StatusItem>
        <StatusSep />
        {/* Path */}
        <StatusItem>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#56687a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {activeSession?.currentPath ?? '~/'}
          </span>
        </StatusItem>
        <StatusSep />
        {/* Bandwidth */}
        <StatusItem>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#56687a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
          <span>0 KB/s</span>
        </StatusItem>
        <StatusSep />
        <StatusItem><span>UTF-8</span></StatusItem>
        <StatusSep />
        <StatusItem><span>LF</span></StatusItem>
        <StatusSep />
        <StatusItem><span style={{ color: '#22c55e' }}>STABLE</span></StatusItem>
      </div>
    </div>
  )
}

function StatusItem({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-1 px-3"
      style={{ color: '#56687a', fontSize: '0.55rem', fontFamily: "'Inter', sans-serif", fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', height: '100%', borderRight: '1px solid #1d2126' }}
    >
      {children}
    </div>
  )
}

function StatusSep() {
  return null // dividers are handled via borderRight on StatusItem
}
