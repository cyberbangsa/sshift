import { useCallback, useEffect, useState } from 'react'
import { useHost, useSession } from '@/application/hooks'
import { useSessionStore } from '@/application/stores'
import { hostRepository, sessionRepository } from '@/infrastructure/repositories'
import { passphraseCache } from '@/infrastructure/passphraseCache'
import { AddHostModal } from '@/presentation/components/sidebar'
import { PassphraseModal } from '@/presentation/components/terminal'
import { Toast, formatSshError, isPassphraseError } from '@/presentation/shared'
import type { Host } from '@/domain/entities'

export function Dashboard() {
  const { hosts, loadHosts, saveHost, deleteHost } = useHost(hostRepository)
  const { sessions } = useSessionStore()
  const { connectHost } = useSession(sessionRepository)
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const [editingHost, setEditingHost] = useState<Host | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [passphraseHost, setPassphraseHost] = useState<Host | null>(null)
  const [passphraseConnecting, setPassphraseConnecting] = useState(false)

  useEffect(() => {
    loadHosts()
  }, [loadHosts])

  /* ── Per-card connect ──────────────────────────────────────── */
  const handleConnectHost = useCallback(
    async (host: Host) => {
      try {
        setConnectingId(host.id)
        setConnectError(null)
        const cachedPassphrase = host.vaultEntryId
          ? passphraseCache.get(host.vaultEntryId)
          : undefined
        await connectHost(cachedPassphrase ? { ...host, keyPassphrase: cachedPassphrase } : host)
      } catch (err) {
        console.error('[Dashboard] connect failed:', err)
        const rawErr =
          err instanceof Error ? err.message : typeof err === 'string' ? err : 'Connection failed'
        if (isPassphraseError(rawErr)) {
          setPassphraseHost(host)
        } else {
          setConnectError(`${formatSshError(rawErr)}\n${rawErr.slice(0, 160)}`)
        }
      } finally {
        setConnectingId(null)
      }
    },
    [connectHost],
  )

  /* ── Passphrase submit ─────────────────────────────────────── */
  const handlePassphraseSubmit = useCallback(
    async (passphrase: string) => {
      if (!passphraseHost) return
      const host = passphraseHost
      // Cache so subsequent connects don't re-prompt
      if (host.vaultEntryId) passphraseCache.set(host.vaultEntryId, passphrase)
      setPassphraseHost(null)
      try {
        setPassphraseConnecting(true)
        setConnectingId(host.id)
        setConnectError(null)
        await connectHost({ ...host, keyPassphrase: passphrase })
      } catch (err) {
        console.error('[Dashboard] passphrase connect failed:', err)
        const rawErr =
          err instanceof Error ? err.message : typeof err === 'string' ? err : 'Connection failed'
        // Clear bad cached passphrase so next attempt re-prompts
        if (host.vaultEntryId && isPassphraseError(rawErr)) {
          passphraseCache.clear(host.vaultEntryId)
          setConnectError('Incorrect passphrase. Please try connecting again.')
        } else {
          setConnectError(`${formatSshError(rawErr)}\n${rawErr.slice(0, 160)}`)
        }
      } finally {
        setPassphraseConnecting(false)
        setConnectingId(null)
      }
    },
    [passphraseHost, connectHost],
  )

  /* Active session ids for status badges */
  const connectedHostIds = new Set(Array.from(sessions.values()).map((s) => s.hostId))

  const handleDeleteHost = useCallback(
    async (id: string) => {
      await deleteHost(id)
      setConfirmDeleteId(null)
    },
    [deleteHost],
  )

  return (
    <>
      <div
        className="flex flex-col h-full overflow-y-auto"
        style={{ background: '#111317', padding: '0 24px 24px' }}
      >
        {/* ── Section header ─────────────────────────────────────── */}
        <div className="flex items-center gap-3 pt-5 mb-4">
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
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}
          >
            {hosts.map((host) => (
              <HostCard
                key={host.id}
                host={host}
                isConnected={connectedHostIds.has(host.id)}
                isConnecting={connectingId === host.id}
                confirmingDelete={confirmDeleteId === host.id}
                onConnect={handleConnectHost}
                onEdit={(h) => setEditingHost(h)}
                onDelete={(id) => setConfirmDeleteId(id)}
                onDeleteConfirm={handleDeleteHost}
                onDeleteCancel={() => setConfirmDeleteId(null)}
              />
            ))}
          </div>
        )}
      </div>

      {editingHost !== null && (
        <AddHostModal
          isOpen
          onClose={() => setEditingHost(null)}
          onSave={async (host) => {
            await saveHost(host)
            setEditingHost(null)
          }}
          editHost={editingHost}
        />
      )}
      {connectError && (
        <Toast message={connectError} type="error" onDismiss={() => setConnectError(null)} />
      )}
      {passphraseHost && (
        <PassphraseModal
          hostname={passphraseHost.hostname}
          username={passphraseHost.username}
          isConnecting={passphraseConnecting}
          onConfirm={handlePassphraseSubmit}
          onCancel={() => setPassphraseHost(null)}
        />
      )}
    </>
  )
}

/* ── HostCard ─────────────────────────────────────────────────── */
function HostCard({
  host,
  isConnected,
  isConnecting,
  confirmingDelete,
  onConnect,
  onEdit,
  onDelete,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  host: Host
  isConnected: boolean
  isConnecting: boolean
  confirmingDelete: boolean
  onConnect: (host: Host) => void
  onEdit: (host: Host) => void
  onDelete: (id: string) => void
  onDeleteConfirm: (id: string) => void
  onDeleteCancel: () => void
}) {
  return (
    <div
      className="relative flex flex-col gap-3 p-4 rounded-lg transition-all duration-150 group"
      style={{
        background: '#161a1e',
        border: `1px solid ${isConnected ? 'rgba(0,212,255,0.25)' : 'rgba(60,73,78,0.25)'}`,
        boxShadow: isConnected ? '0 0 0 1px rgba(0,212,255,0.08) inset' : 'none',
      }}
    >
      {/* Top row: icon + status + actions */}
      <div className="flex items-start justify-between">
        <div
          className="flex items-center justify-center rounded"
          style={{ width: 32, height: 32, background: 'rgba(168,232,255,0.07)' }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#a8e8ff"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <polyline points="8 21 12 17 16 21" />
          </svg>
        </div>

        <div className="flex items-center gap-1">
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
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(host)
            }}
            className="p-1 rounded transition-all hover:bg-white/10"
            title="Edit"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#8a9bb0"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(host.id)
            }}
            className="p-1 rounded transition-all hover:bg-red-500/10"
            title="Delete"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#f87171"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Delete confirm overlay */}
      {confirmingDelete && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg"
          style={{ background: 'rgba(12,14,17,0.92)', backdropFilter: 'blur(2px)', zIndex: 10 }}
        >
          <p
            className="text-[0.6875rem] text-center"
            style={{ color: '#fca5a5', fontFamily: "'Inter', sans-serif" }}
          >
            Delete <strong>{host.label}</strong>?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onDeleteCancel()}
              className="px-3 py-1 rounded text-[0.6rem] font-semibold transition-colors"
              style={{ background: '#1d2126', color: '#8a9bb0', border: '1px solid #3c494e' }}
            >
              Cancel
            </button>
            <button
              onClick={() => onDeleteConfirm(host.id)}
              className="px-3 py-1 rounded text-[0.6rem] font-semibold transition-colors"
              style={{
                background: 'rgba(239,68,68,0.15)',
                color: '#f87171',
                border: '1px solid rgba(239,68,68,0.3)',
              }}
            >
              Delete
            </button>
          </div>
        </div>
      )}

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
          background: isConnected ? 'rgba(74,222,128,0.08)' : 'rgba(168,232,255,0.06)',
          border: `1px solid ${isConnected ? 'rgba(74,222,128,0.2)' : 'rgba(168,232,255,0.12)'}`,
          color: isConnected ? '#4ade80' : '#a8e8ff',
          fontSize: '0.6rem',
          fontFamily: "'Inter', sans-serif",
          letterSpacing: '0.12em',
        }}
      >
        {isConnecting ? (
          <>
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              style={{ animation: 'spin 1s linear infinite' }}
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            CONNECTING…
          </>
        ) : isConnected ? (
          <>
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 3 21 3 21 9" />
              <path d="M10 14L21 3" />
              <path d="M21 16v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
            </svg>
            OPEN SESSION
          </>
        ) : (
          <>
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <polyline points="12 5 19 12 12 19" />
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
        <svg
          width="9"
          height="9"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
        </svg>
      ) : (
        <svg
          width="9"
          height="9"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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
        style={{
          width: 48,
          height: 48,
          background: 'rgba(168,232,255,0.05)',
          border: '1px solid rgba(168,232,255,0.1)',
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#56687a"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <polyline points="8 21 12 17 16 21" />
        </svg>
      </div>
      <p
        className="text-xs text-center"
        style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#56687a' }}
      >
        No saved connections yet.
        <br />
        Add a host using the sidebar or quick-connect above.
      </p>
    </div>
  )
}
