import { useCallback, useEffect, useState } from 'react'
import { useHost, useSession } from '@/application/hooks'
import { useSessionStore } from '@/application/stores'
import { hostRepository, sessionRepository } from '@/infrastructure/repositories'
import type { Host } from '@/domain/entities'

export function Dashboard() {
  const { hosts, loadHosts }                    = useHost(hostRepository)
  const { sessions }                             = useSessionStore()
  const { connectHost }                          = useSession(sessionRepository)
  const [quickConnect, setQuickConnect]          = useState('')
  const [quickConnecting, setQuickConnecting]    = useState(false)
  const [connectingId, setConnectingId]          = useState<string | null>(null)

  useEffect(() => { loadHosts() }, [loadHosts])

  /* ── Quick Connect ─────────────────────────────────────────── */
  const handleQuickConnect = useCallback(async () => {
    const raw = quickConnect.trim()
    if (!raw) return

    let username = ''
    let hostname = raw
    let port     = 22

    if (raw.includes('@')) {
      const [u, rest] = raw.split('@')
      username = u
      hostname = rest
    }
    if (hostname.includes(':')) {
      const [h, p] = hostname.split(':')
      hostname = h
      port     = parseInt(p, 10) || 22
    }

    const existing = hosts.find(
      (h) => h.hostname === hostname && (!username || h.username === username)
    )
    const host: Host = existing ?? {
      id:         crypto.randomUUID(),
      label:      hostname,
      hostname,
      port,
      username:   username || 'root',
      authMethod: 'password',
      tags:       [],
      createdAt:  new Date(),
    }

    try {
      setQuickConnecting(true)
      await connectHost(host)
    } catch (err) {
      console.error('[Dashboard] quick-connect failed:', err)
    } finally {
      setQuickConnecting(false)
    }
  }, [quickConnect, hosts, connectHost])

  /* ── Per-card connect ──────────────────────────────────────── */
  const handleConnectHost = useCallback(async (host: Host) => {
    try {
      setConnectingId(host.id)
      await connectHost(host)
    } catch (err) {
      console.error('[Dashboard] connect failed:', err)
    } finally {
      setConnectingId(null)
    }
  }, [connectHost])

  /* Active session ids for status badges */
  const connectedHostIds = new Set(Array.from(sessions.values()).map((s) => s.hostId))

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ background: '#111317', padding: '0 24px 24px' }}
    >
      {/* ── Quick Connect bar ──────────────────────────────────── */}
      <div className="pt-5 pb-5">
        <div
          className="flex items-center gap-3 px-4 py-2.5 rounded"
          style={{ background: '#161a1e', border: '1px solid #1d2126' }}
        >
          <div className="flex items-center gap-2 shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8a9bb0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <span
              className="text-[0.6875rem] font-semibold"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: '#8a9bb0' }}
            >
              ssh
            </span>
          </div>
          <span style={{ color: '#252a30', fontSize: '1rem' }}>|</span>
          <input
            type="text"
            placeholder="user@hostname:port"
            value={quickConnect}
            onChange={(e) => setQuickConnect(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuickConnect()}
            className="flex-1 bg-transparent outline-none text-text-primary placeholder:text-text-muted"
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6875rem' }}
          />
          <button
            disabled={quickConnecting || !quickConnect.trim()}
            onClick={handleQuickConnect}
            className="shrink-0 px-4 py-1.5 font-semibold tracking-widest transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #a8e8ff, #00d4ff)',
              color: '#0c0e11',
              borderRadius: '4px',
              fontSize: '0.6875rem',
              fontFamily: "'Inter', sans-serif",
              letterSpacing: '0.08em',
            }}
          >
            {quickConnecting ? 'CONNECTING…' : 'CONNECT'}
          </button>
        </div>
      </div>

      {/* ── Section header ─────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4">
        <h2
          className="text-sm font-semibold shrink-0"
          style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#e2e2e6' }}
        >
          Saved Connections
        </h2>
        <div className="flex-1 h-px" style={{ background: '#1d2126' }} />
        <span
          className="text-[0.6rem] font-mono tracking-widest shrink-0"
          style={{ color: '#56687a' }}
        >
          {hosts.length} HOST{hosts.length !== 1 ? 'S' : ''}
        </span>
      </div>

      {/* ── Host grid ──────────────────────────────────────────── */}
      {hosts.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          {hosts.map((host) => (
            <HostCard
              key={host.id}
              host={host}
              isConnected={connectedHostIds.has(host.id)}
              isConnecting={connectingId === host.id}
              onConnect={handleConnectHost}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── HostCard ─────────────────────────────────────────────────── */
function HostCard({
  host,
  isConnected,
  isConnecting,
  onConnect,
}: {
  host: Host
  isConnected: boolean
  isConnecting: boolean
  onConnect: (host: Host) => void
}) {
  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-lg transition-all duration-150 group"
      style={{
        background: '#161a1e',
        border: `1px solid ${isConnected ? 'rgba(0,212,255,0.25)' : 'rgba(60,73,78,0.25)'}`,
        boxShadow: isConnected ? '0 0 0 1px rgba(0,212,255,0.08) inset' : 'none',
      }}
    >
      {/* Top row: icon + status */}
      <div className="flex items-start justify-between">
        <div
          className="flex items-center justify-center rounded"
          style={{ width: 32, height: 32, background: 'rgba(168,232,255,0.07)' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a8e8ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" /><polyline points="8 21 12 17 16 21" />
          </svg>
        </div>

        {isConnected ? (
          <span
            className="text-[0.55rem] font-mono font-semibold tracking-widest px-1.5 py-0.5 rounded-sm"
            style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80' }}
          >
            CONNECTED
          </span>
        ) : (
          <AuthBadge method={host.authMethod} />
        )}
      </div>

      {/* Host info */}
      <div className="flex-1 min-w-0">
        <span
          className="text-sm font-semibold block truncate"
          style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#e2e2e6' }}
        >
          {host.label}
        </span>
        <span
          className="text-[0.625rem] block mt-0.5 truncate"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: '#8a9bb0' }}
        >
          {host.username}@{host.hostname}:{host.port}
        </span>
      </div>

      {/* Tags */}
      {host.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {host.tags.map((tag) => (
            <span
              key={tag}
              className="text-[0.55rem] font-mono tracking-wider px-1.5 py-0.5 rounded-sm"
              style={{ background: 'rgba(138,155,176,0.1)', color: '#8a9bb0' }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Connect button */}
      <button
        disabled={isConnecting}
        onClick={() => onConnect(host)}
        className="w-full flex items-center justify-center gap-2 py-1.5 rounded font-semibold tracking-widest transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: isConnected
            ? 'rgba(74,222,128,0.08)'
            : 'rgba(168,232,255,0.06)',
          border: `1px solid ${isConnected ? 'rgba(74,222,128,0.2)' : 'rgba(168,232,255,0.12)'}`,
          color: isConnected ? '#4ade80' : '#a8e8ff',
          fontSize: '0.6rem',
          fontFamily: "'Inter', sans-serif",
          letterSpacing: '0.12em',
        }}
      >
        {isConnecting ? (
          <>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            CONNECTING…
          </>
        ) : isConnected ? (
          <>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9" /><path d="M10 14L21 3" /><path d="M21 16v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
            </svg>
            OPEN SESSION
          </>
        ) : (
          <>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" /><polyline points="12 5 19 12 12 19" />
            </svg>
            CONNECT
          </>
        )}
      </button>
    </div>
  )
}

/* ── AuthBadge ────────────────────────────────────────────────── */
function AuthBadge({ method }: { method: Host['authMethod'] }) {
  const isKey = method === 'privateKey'
  return (
    <span
      className="flex items-center gap-1 text-[0.55rem] font-mono font-semibold tracking-widest px-1.5 py-0.5 rounded-sm"
      style={{
        background: isKey ? 'rgba(168,232,255,0.08)' : 'rgba(245,158,11,0.08)',
        color: isKey ? '#a8e8ff' : '#f59e0b',
      }}
    >
      {isKey ? (
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
        </svg>
      ) : (
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      )}
      {isKey ? 'KEY' : 'PASS'}
    </span>
  )
}

/* ── EmptyState ───────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 py-20">
      <div
        className="flex items-center justify-center rounded-full"
        style={{ width: 48, height: 48, background: 'rgba(168,232,255,0.05)', border: '1px solid rgba(168,232,255,0.1)' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#56687a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" /><polyline points="8 21 12 17 16 21" />
        </svg>
      </div>
      <p
        className="text-xs text-center"
        style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#56687a' }}
      >
        No saved connections yet.<br />Add a host using the sidebar or quick-connect above.
      </p>
    </div>
  )
}
