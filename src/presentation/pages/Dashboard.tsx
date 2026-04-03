import { useCallback, useEffect, useState } from 'react'
import { useHost, useSession } from '@/application/hooks'
import { useSessionStore } from '@/application/stores'
import { hostRepository, sessionRepository } from '@/infrastructure/repositories'
import type { ReactNode } from 'react'
import type { Host } from '@/domain/entities'

/* ── Static mock data for Vault & Credentials ────────────────── */
const VAULT_GROUPS = [
  {
    id: 'project-alpha',
    label: 'PROJECT ALPHA',
    defaultOpen: true,
    credentials: [
      { id: 'c1', name: 'id_rsa_alpha',    type: 'key',  tag: 'ED25519',   tagColor: '#a8e8ff' },
      { id: 'c2', name: 'sudo-vault-pass', type: 'pass', tag: 'ENCRYPTED', tagColor: '#f59e0b' },
    ],
  },
  {
    id: 'security-audit',
    label: 'SECURITY AUDIT',
    defaultOpen: false,
    credentials: [],
  },
]

/* ── Recent sessions mock (shown when no real sessions exist) ─── */
const RECENT_MOCK = [
  { id: 'm1', name: 'Worker Node 4',  address: 'root@192.168.1.45',     icon: 'terminal', ago: '2M AGO'    },
  { id: 'm2', name: 'Auth Service',   address: 'ubuntu@aws-us-east-1',  icon: 'list',     ago: '1H AGO'    },
  { id: 'm3', name: 'Legacy Gateway', address: 'admin@172.16.0.2',      icon: 'cloud',    ago: 'YESTERDAY' },
]

export function Dashboard() {
  const { hosts, loadHosts }    = useHost(hostRepository)
  const { sessions }             = useSessionStore()
  const { connectHost }          = useSession(sessionRepository)
  const [quickConnect, setQuickConnect] = useState('')
  const [connecting, setConnecting]     = useState(false)

  useEffect(() => { loadHosts() }, [loadHosts])

  const handleQuickConnect = useCallback(async () => {
    const raw = quickConnect.trim()
    if (!raw) return

    // Parse  user@hostname:port
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

    // Prefer an existing saved host; otherwise create an ad-hoc one
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
      setConnecting(true)
      await connectHost(host)
    } catch (err) {
      console.error('[Dashboard] quick-connect failed:', err)
    } finally {
      setConnecting(false)
    }
  }, [quickConnect, hosts, connectHost])

  /* Last 3 real sessions (newest first), or fall back to mock */
  const recentSessions = (() => {
    const live = Array.from(sessions.values()).slice(-3).reverse()
    if (live.length > 0) return null // render real sessions (handled below)
    return RECENT_MOCK
  })()

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ background: '#111317', padding: '0 24px 24px' }}
    >
      {/* ── Quick Connect bar ────────────────────────────────────── */}
      <div className="pt-5 pb-4">
        <div
          className="flex items-center gap-3 px-4 py-2.5 rounded"
          style={{ background: '#161a1e', border: '1px solid #1d2126' }}
        >
          {/* ssh label */}
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
          {/* Divider */}
          <span style={{ color: '#252a30', fontSize: '1rem' }}>|</span>
          {/* Input */}
          <input
            type="text"
            placeholder="user@hostname:port"
            value={quickConnect}
            onChange={(e) => setQuickConnect(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuickConnect()}
            className="flex-1 bg-transparent outline-none text-text-primary placeholder:text-text-muted"
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6875rem' }}
          />
          {/* Connect button */}
          <button
            disabled={connecting || !quickConnect.trim()}
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
            {connecting ? 'CONNECTING…' : 'CONNECT'}
          </button>
        </div>
      </div>

      {/* ── Recent Sessions ──────────────────────────────────────── */}
      <section className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <h2
            className="text-sm font-semibold"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#e2e2e6' }}
          >
            Recent Sessions
          </h2>
          {/* Decorative line */}
          <div className="flex-1 h-px" style={{ background: '#1d2126' }} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          {recentSessions
            ? /* Mock cards */
              recentSessions.map((s) => (
                <SessionCard key={s.id} icon={s.icon} name={s.name} address={s.address} ago={s.ago} />
              ))
            : /* Live cards */
              Array.from(sessions.values())
                .slice(-3)
                .reverse()
                .map((session) => {
                  const host = hosts.find((h) => h.id === session.hostId)
                  return (
                    <SessionCard
                      key={session.id}
                      icon="terminal"
                      name={host?.label ?? session.hostId}
                      address={host ? `${host.username}@${host.hostname}` : '—'}
                      ago="recent"
                    />
                  )
                })}
        </div>
      </section>

      {/* ── Vault & Credentials ─────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-sm font-semibold"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#e2e2e6' }}
          >
            Vault &amp; Credentials
          </h2>
          <span
            className="text-[0.6rem] font-mono tracking-widest"
            style={{ color: '#56687a' }}
          >
            8 Total Identities
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {VAULT_GROUPS.map((group) => (
            <VaultGroup key={group.id} group={group} />
          ))}
        </div>
      </section>
    </div>
  )
}

/* ── SessionCard ──────────────────────────────────────────────── */
function SessionCard({
  icon,
  name,
  address,
  ago,
}: {
  icon: string
  name: string
  address: string
  ago: string
}) {
  return (
    <div
      className="flex flex-col gap-2 p-3 rounded cursor-pointer hover:border-accent-primary/30 transition-colors"
      style={{ background: '#161a1e', border: '1px solid rgba(60,73,78,0.2)' }}
    >
      {/* Top row: icon + timestamp */}
      <div className="flex items-start justify-between">
        <SessionIcon name={icon} />
        <span
          className="text-[0.55rem] font-mono tracking-widest"
          style={{ color: '#56687a' }}
        >
          {ago}
        </span>
      </div>
      {/* Name */}
      <div>
        <span
          className="text-sm font-semibold block"
          style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#e2e2e6' }}
        >
          {name}
        </span>
        <span
          className="text-[0.625rem] block mt-0.5 truncate"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: '#8a9bb0' }}
        >
          {address}
        </span>
      </div>
    </div>
  )
}

/* ── SessionIcon ─────────────────────────────────────────────── */
function SessionIcon({ name }: { name: string }) {
  const s = { stroke: '#a8e8ff', strokeWidth: '1.8', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' }
  if (name === 'terminal') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" {...s}>
        <rect x="2" y="3" width="20" height="14" rx="2" /><polyline points="8 21 12 17 16 21" />
      </svg>
    )
  }
  if (name === 'list') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" {...s}>
        <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    )
  }
  /* cloud */
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...s}>
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  )
}

/* ── VaultGroup ──────────────────────────────────────────────── */
function VaultGroup({
  group,
}: {
  group: (typeof VAULT_GROUPS)[number]
}) {
  const [open, setOpen] = useState(group.defaultOpen)

  return (
    <div
      className="rounded overflow-hidden"
      style={{ background: '#161a1e', border: '1px solid rgba(60,73,78,0.2)' }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2">
          {/* Folder icon */}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a8e8ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span
            className="text-[0.6rem] font-semibold tracking-[0.15em] uppercase"
            style={{ fontFamily: "'Inter', sans-serif", color: '#a8e8ff' }}
          >
            {group.label}
          </span>
        </div>
        {/* Chevron */}
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="#56687a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 150ms ease-out' }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* Credentials */}
      {open && group.credentials.length > 0 && (
        <div style={{ borderTop: '1px solid #1d2126' }}>
          {group.credentials.map((cred) => (
            <CredentialRow key={cred.id} name={cred.name} type={cred.type} tag={cred.tag} tagColor={cred.tagColor} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── CredentialRow ───────────────────────────────────────────── */
function CredentialRow({
  name,
  type,
  tag,
  tagColor,
}: {
  name: string
  type: string
  tag: string
  tagColor: string
}) {
  return (
    <div
      className="flex items-center justify-between px-3 py-2 hover:bg-white/[0.03] transition-colors cursor-pointer"
      style={{ borderBottom: '1px solid #1a1f24' }}
    >
      <div className="flex items-center gap-2">
        <CredIcon type={type} />
        <span
          className="text-[0.6875rem]"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: '#e2e2e6' }}
        >
          {name}
        </span>
      </div>
      <span
        className="text-[0.55rem] font-mono font-semibold px-1.5 py-0.5 rounded-sm tracking-widest"
        style={{ background: `${tagColor}22`, color: tagColor }}
      >
        {tag}
      </span>
    </div>
  )
}

function CredIcon({ type }: { type: string }): ReactNode {
  const color = '#56687a'
  if (type === 'key') {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
      </svg>
    )
  }
  /* password / dots */
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
