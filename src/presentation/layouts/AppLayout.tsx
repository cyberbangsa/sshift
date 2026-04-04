import type { ReactNode } from 'react'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useHostStore, useSessionStore, useUIStore, useSettingsStore, useTerminalStore } from '@/application/stores'
import { useHost, useSession, useAIAgent } from '@/application/hooks'
import { hostRepository, sessionRepository } from '@/infrastructure/repositories'
import { AddHostModal } from '@/presentation/components/sidebar'
import { AIPanel } from '@/presentation/components/ai'
import { Button, Modal } from '@/presentation/shared'
import { APP_NAME } from '@/config'
import type { Host, AIRule } from '@/domain/entities'

interface AppLayoutProps {
  children: ReactNode
}

/** Navigation items below CONNECTIONS (dashboard mode) */

export function AppLayout({ children }: AppLayoutProps) {
  const [isAddHostOpen, setIsAddHostOpen] = useState(false)

  // Connection state
  const [connectError, setConnectError]         = useState<string | null>(null)
  const errorTimerRef                           = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Password prompt for hosts with no stored password
  const [pendingHost, setPendingHost]           = useState<Host | null>(null)
  const [pendingPassword, setPendingPassword]   = useState('')
  const [showPendingPw, setShowPendingPw]       = useState(false)

  const { openSettings } = useUIStore()
  const { hosts: allHosts } = useHostStore()
  const { sessions, activeSessionId, setActiveSession } = useSessionStore()
  const { activeTerminalHandle } = useTerminalStore()

  // For manual Run button clicks in the AI chat UI — fire and forget
  const onRunCommand = useCallback((cmd: string) => {
    activeTerminalHandle?.sendInput(cmd + '\r')
    activeTerminalHandle?.focus()
  }, [activeTerminalHandle])

  // For the agentic loop — sends the command and returns the terminal output
  const agentRunCommand = useCallback(async (cmd: string): Promise<string> => {
    if (!activeTerminalHandle) return ''
    activeTerminalHandle.sendInput(cmd + '\r')
    activeTerminalHandle.focus()
    return activeTerminalHandle.captureOutput(8000)
  }, [activeTerminalHandle])

  // For the agentic loop — reads a remote file via SFTP
  const agentReadFile = useCallback(async (filePath: string): Promise<string> => {
    if (!activeSessionId) return ''
    try {
      return await invoke<string>('read_remote_file', { sessionId: activeSessionId, path: filePath })
    } catch (e) {
      return `Error reading file: ${e}`
    }
  }, [activeSessionId])

  const activeHostForRules = useMemo(() => {
    const s = activeSessionId ? sessions.get(activeSessionId) : undefined
    return s ? allHosts.find((h) => h.id === s.hostId) ?? null : null
  }, [activeSessionId, sessions, allHosts])

  const { messages, isStreaming, error, sendMessage, abort, clearMessages, executionMode, setExecutionMode } = useAIAgent(agentRunCommand, agentReadFile, activeHostForRules?.aiRules)
  const { loadApiKey, isApiKeyLoaded } = useSettingsStore()
  const { hosts, saveHost } = useHost(hostRepository)
  const { connectHost, disconnectSession } = useSession(sessionRepository)

  const handleUpdateHostRules = useCallback(
    (rules: AIRule[]) => {
      if (activeHostForRules) saveHost({ ...activeHostForRules, aiRules: rules })
    },
    [activeHostForRules, saveHost],
  )

  const handleConnect = useCallback(
    async (host: Host) => {
      // If host already has an active session, just switch to it
      const existing = Array.from(sessions.values()).find((s) => s.hostId === host.id)
      if (existing) {
        setActiveSession(existing.id)
        return
      }
      // If password auth and no stored password, prompt first
      if (host.authMethod === 'password' && !host.password) {
        setPendingHost(host)
        setPendingPassword('')
        return
      }
      setConnectError(null)
      try {
        await connectHost(host)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        const debug = `[${host.username}@${host.hostname}:${host.port} auth=${host.authMethod}${host.privateKeyPath ? ' key=' + host.privateKeyPath : ''}${host.password ? ' pw=***' : ''}]`
        setConnectError(`${msg}\n${debug}`)
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
        errorTimerRef.current = setTimeout(() => setConnectError(null), 10000)
      }
    },
    [connectHost, sessions, setActiveSession],
  )

  // Called from the password-prompt modal
  const handleConnectWithPassword = useCallback(async () => {
    if (!pendingHost) return
    const host = { ...pendingHost, password: pendingPassword }
    setPendingHost(null)
    setPendingPassword('')
    await handleConnect(host)
  }, [pendingHost, pendingPassword, handleConnect])

  useEffect(() => () => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
  }, [])

  // Load OpenRouter API key from the OS keychain on first mount
  useEffect(() => {
    if (!isApiKeyLoaded) {
      loadApiKey()
    }
  }, [isApiKeyLoaded, loadApiKey])



  /* ── SESSION MODE (any open sessions, including dashboard tab) ── */
  if (sessions.size > 0) {
    const sessionHosts  = Array.from(sessions.values()).map((s) => ({
      session: s,
      host: hosts.find((h) => h.id === s.hostId),
    }))

    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden" style={{ background: '#0c0e11' }}>
        {/* ── Global top bar ─────────────────────────────────── */}
        <div
          className="flex items-center h-[44px] shrink-0 gap-3 px-4"
          style={{ background: '#111317', borderBottom: '1px solid #1d2126' }}
        >
          {/* Logo */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className="font-mono text-[0.6rem] font-bold px-1 py-0.5 rounded"
              style={{ background: 'linear-gradient(135deg, #a8e8ff, #00d4ff)', color: '#0c0e11' }}
            >
              &gt;_
            </span>
            <span
              className="text-sm font-bold tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#e2e2e6' }}
            >
              {APP_NAME}
            </span>
          </div>

          {/* Jump to command */}
          <div
            className="flex-1 max-w-xs flex items-center gap-2 px-3 py-1.5 rounded"
            style={{ background: '#161a1e', border: '1px solid #1d2126' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#56687a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span
              className="text-[0.6875rem]"
              style={{ fontFamily: "'Inter', sans-serif", color: '#56687a' }}
            >
              Jump to command…
            </span>
          </div>

          {/* ── Session tab strip ──────────────────────────── */}
          <div className="flex items-center flex-1 overflow-x-auto" style={{ marginLeft: '12px' }}>
            {/* Dashboard tab */}
            <button
              onClick={() => setActiveSession(null)}
              className="flex items-center gap-1.5 px-3 h-[44px] text-[0.6875rem] font-medium transition-colors shrink-0"
              style={{
                color: activeSessionId === null ? '#a8e8ff' : '#8a9bb0',
                borderBottom: activeSessionId === null ? '2px solid #a8e8ff' : '2px solid transparent',
                fontFamily: "'Inter', sans-serif",
                letterSpacing: '0.04em',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Dashboard
            </button>

            {/* Divider */}
            <span className="mx-1" style={{ color: '#252a30', fontSize: '1rem', userSelect: 'none' }}>|</span>

            {/* One tab per open session */}
            {sessionHosts.map(({ session, host }) => {
              const isActive = session.id === activeSessionId
              return (
                <div key={session.id} className="flex items-center shrink-0 group">
                  <button
                    onClick={() => setActiveSession(session.id)}
                    className="flex items-center gap-1.5 px-3 h-[44px] text-[0.6875rem] font-medium transition-colors"
                    style={{
                      color: isActive ? '#a8e8ff' : '#8a9bb0',
                      borderBottom: isActive ? '2px solid #a8e8ff' : '2px solid transparent',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#22c55e' }} />
                    {(host?.label ?? host?.hostname ?? session.hostId).toUpperCase()}
                  </button>
                  <button
                    onClick={() => disconnectSession(session.id)}
                    className="px-1 h-[44px] opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity"
                    aria-label="Close session"
                    style={{ color: '#8a9bb0' }}
                  >
                    <svg width="9" height="9" viewBox="0 0 16 16" fill="none">
                      <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-1.5 shrink-0" style={{ marginLeft: '16px' }}>
            <button
              className="p-1.5 rounded hover:bg-white/5 transition-colors"
              aria-label="Settings"
              onClick={() => openSettings()}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8a9bb0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0">
          {/* Main content */}
          <div className="flex-1 min-w-0 relative">{children}</div>

          {/* AI Panel — always visible in session mode */}
          <div
            className="w-[280px] shrink-0 flex flex-col"
            style={{ borderLeft: '1px solid #1d2126' }}
          >
            <AIPanel
              messages={messages}
              isStreaming={isStreaming}
              error={error}
              onSendMessage={sendMessage}
              onAbort={abort}
              onClearChat={clearMessages}
              onRunCommand={onRunCommand}
              executionMode={executionMode}
              onSetExecutionMode={setExecutionMode}
              hostRules={activeHostForRules?.aiRules ?? []}
              onUpdateHostRules={handleUpdateHostRules}
            />
          </div>
        </div>

        <AddHostModal
          isOpen={isAddHostOpen}
          onClose={() => setIsAddHostOpen(false)}
          onSave={saveHost}
        />
      </div>
    )
  }

  /* ── DASHBOARD MODE ──────────────────────────────────────────── */
  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: '#111317' }}>
      <div className="flex-1 min-w-0">{children}</div>

      <AddHostModal
        isOpen={isAddHostOpen}
        onClose={() => setIsAddHostOpen(false)}
        onSave={saveHost}
      />

      {/* ── Connection error banner ──────────────────────────── */}
      {connectError && (
        <div
          className="fixed bottom-4 left-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl"
          style={{
            transform: 'translateX(-50%)',
            background: '#1e1215',
            border: '1px solid #7f1d1d',
            color: '#fca5a5',
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.75rem',
            maxWidth: '480px',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
            <span className="flex-1 flex flex-col gap-0.5">
              <span><strong>SSH connection failed:</strong> {connectError?.split('\n')[0]}</span>
              {connectError?.includes('\n') && (
                <code className="text-[0.65rem] opacity-60" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {connectError.split('\n')[1]}
                </code>
              )}
            </span>
          <button onClick={() => setConnectError(null)} className="opacity-60 hover:opacity-100" aria-label="Dismiss">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Password prompt modal ────────────────────────────── */}
      <Modal
        isOpen={pendingHost !== null}
        onClose={() => { setPendingHost(null); setPendingPassword('') }}
        title={`Connect to ${pendingHost?.label ?? ''}`}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm" style={{ color: '#8a9bb0' }}>
            Enter the SSH password for <code className="px-1 rounded" style={{ background: '#1d2126', color: '#a8e8ff' }}>{pendingHost?.username}@{pendingHost?.hostname}</code>
          </p>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded"
            style={{ background: '#1d2126', border: '1px solid #3c494e' }}
          >
            <input
              autoFocus
              type={showPendingPw ? 'text' : 'password'}
              placeholder="Password"
              value={pendingPassword}
              onChange={(e) => setPendingPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConnectWithPassword() }}
              className="flex-1 bg-transparent outline-none text-sm text-text-primary placeholder:text-text-muted"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            />
            <button
              type="button"
              onClick={() => setShowPendingPw((v) => !v)}
              className="opacity-50 hover:opacity-100 transition-opacity"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8a9bb0" strokeWidth="1.8" strokeLinecap="round">
                {showPendingPw
                  ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>
                  : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>}
              </svg>
            </button>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setPendingHost(null); setPendingPassword('') }}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConnectWithPassword}
              disabled={!pendingPassword.trim()}
            >
              Connect
            </Button>
          </div>
        </div>
      </Modal>

      {/* Spin keyframe for loading spinner */}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}


