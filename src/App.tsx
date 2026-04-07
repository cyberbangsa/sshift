import { RouterProvider } from '@tanstack/react-router'
import { useState, useCallback, Component } from 'react'
import type { ReactNode } from 'react'
import { router } from './router'
import { AppLayout } from '@/presentation/layouts'
import { Dashboard, Settings } from '@/presentation/pages'
import { ActiveSession } from '@/presentation/pages/ActiveSession'
import { useSessionStore, useUIStore, useAIStore } from '@/application/stores'
import { sessionRepository } from '@/infrastructure/repositories'

interface SessionError {
  sessionId: string
  hostLabel: string
  exitCode: number
}

// ── Error Boundary ────────────────────────────────────────────────────────────
interface EBState {
  error: Error | null
}
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: 32,
            fontFamily: 'monospace',
            color: '#ef4444',
            background: '#0c0e11',
            height: '100vh',
          }}
        >
          <p style={{ color: '#fbbf24', marginBottom: 8, fontWeight: 'bold' }}>
            Render Error (open DevTools for full stack)
          </p>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{this.state.error.message}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, color: '#56687a', marginTop: 12 }}>
            {this.state.error.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}
// ─────────────────────────────────────────────────────────────────────────────

function AppContent() {
  const { sessions, activeSessionId, removeSession, setActiveSession } = useSessionStore()
  const [sessionError, setSessionError] = useState<SessionError | null>(null)
  const sessionList = Array.from(sessions.values())

  const handleSessionClosed = useCallback(
    (sessionId: string, hostLabel: string, exitCode: number) => {
      if (exitCode === 0) {
        // Normal exit (user typed `exit`) — silently close the tab
        sessionRepository.disconnect(sessionId).catch(() => {})
        removeSession(sessionId)
        useAIStore.getState().removeSession(sessionId)
      } else {
        // Unexpected close — show error popup, then close tab
        setSessionError({ sessionId, hostLabel, exitCode })
        sessionRepository.disconnect(sessionId).catch(() => {})
        removeSession(sessionId)
        useAIStore.getState().removeSession(sessionId)
      }
    },
    [removeSession],
  )

  const dismissError = useCallback(() => setSessionError(null), [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Dashboard — always mounted, shown when no session is active */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          visibility: activeSessionId === null ? 'visible' : 'hidden',
          pointerEvents: activeSessionId === null ? 'auto' : 'none',
          zIndex: activeSessionId === null ? 1 : 0,
        }}
      >
        <RouterProvider router={router} defaultComponent={Dashboard} />
      </div>

      {/* Sessions — all kept mounted so terminals preserve history */}
      {sessionList.map((session) => {
        const isActive = activeSessionId === session.id
        const host = session.hostId // label stored in store if available
        return (
          <div
            key={session.id}
            style={{
              position: 'absolute',
              inset: 0,
              visibility: isActive ? 'visible' : 'hidden',
              pointerEvents: isActive ? 'auto' : 'none',
              zIndex: isActive ? 1 : 0,
            }}
          >
            <ActiveSession
              sessionId={session.id}
              onClosed={(exitCode) => handleSessionClosed(session.id, host, exitCode)}
            />
          </div>
        )
      })}

      {/* ── Session error popup ─────────────────────────────────────── */}
      {sessionError && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)' }}
        >
          <div
            className="flex flex-col gap-4 p-6 rounded-lg shadow-2xl"
            style={{
              background: '#161a1e',
              border: '1px solid #7f1d1d',
              width: 380,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {/* Icon + title */}
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-9 h-9 rounded-full shrink-0"
                style={{ background: 'rgba(239,68,68,0.12)' }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#f87171"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#fca5a5' }}>
                  Session Disconnected
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#56687a' }}>
                  Exit code{' '}
                  <code
                    className="px-1 rounded"
                    style={{ background: '#1d2126', color: '#f87171' }}
                  >
                    {sessionError.exitCode}
                  </code>
                </p>
              </div>
            </div>

            {/* Message */}
            <p className="text-xs leading-relaxed" style={{ color: '#8a9bb0' }}>
              The SSH connection to{' '}
              <span style={{ color: '#e2e2e6' }}>{sessionError.hostLabel}</span> was closed
              unexpectedly. This can happen due to a network interruption, server-side timeout, or
              the remote process exiting with an error.
            </p>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button
                onClick={dismissError}
                className="px-4 py-1.5 text-xs font-semibold rounded transition-colors"
                style={{ background: '#1d2126', color: '#8a9bb0', border: '1px solid #3c494e' }}
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  dismissError()
                  setActiveSession(null)
                }}
                className="px-4 py-1.5 text-xs font-semibold rounded transition-colors"
                style={{ background: 'linear-gradient(135deg,#a8e8ff,#00d4ff)', color: '#0c0e11' }}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const { isSettingsOpen } = useUIStore()

  return (
    <ErrorBoundary>
      <AppLayout>
        <AppContent />
      </AppLayout>
      {isSettingsOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
          <Settings />
        </div>
      )}
    </ErrorBoundary>
  )
}

export { Dashboard, ActiveSession, Settings }
