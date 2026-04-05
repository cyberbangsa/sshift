import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useHostStore, useSessionStore } from '@/application/stores'
import type { Host } from '@/domain/entities'

/* ── Types ─────────────────────────────────────────────────── */

type PaletteItem =
  | { kind: 'session';  id: string; label: string; subtext: string }
  | { kind: 'host';     host: Host }
  | { kind: 'action';   id: string; label: string; subtext: string; icon: ActionIconName }

type ActionIconName = 'settings' | 'plus' | 'lock' | 'home' | 'terminal'

interface CommandPaletteProps {
  isOpen:              boolean
  onClose:             () => void
  onConnect:           (host: Host) => void
  onAddHost:           () => void
  onOpenSettings:      () => void
  onNavigateVault:     () => void
  onNavigateDashboard: () => void
}

/* ── Static actions ─────────────────────────────────────────── */

const STATIC_ACTIONS: Array<{ id: string; label: string; subtext: string; icon: ActionIconName }> = [
  { id: 'add-host',   label: 'Add New Host',    subtext: 'Open the new host form',       icon: 'plus'     },
  { id: 'settings',   label: 'Open Settings',   subtext: 'AI, terminal & connection config', icon: 'settings' },
  { id: 'vault',      label: 'Go to Vault',     subtext: 'Manage SSH keys & credentials', icon: 'lock'     },
  { id: 'dashboard',  label: 'Go to Dashboard', subtext: 'Return to the host grid',      icon: 'home'     },
]

/* ── Component ──────────────────────────────────────────────── */

export function CommandPalette({
  isOpen,
  onClose,
  onConnect,
  onAddHost,
  onOpenSettings,
  onNavigateVault,
  onNavigateDashboard,
}: CommandPaletteProps) {
  const [query, setQuery]       = useState('')
  const [cursor, setCursor]     = useState(0)
  const inputRef                = useRef<HTMLInputElement>(null)
  const listRef                 = useRef<HTMLDivElement>(null)

  const { hosts }                              = useHostStore()
  const { sessions, setActiveSession } = useSessionStore()

  /* Reset state when opening */
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setCursor(0)
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [isOpen])

  /* Build the flat list of items to show */
  const items = useMemo<PaletteItem[]>(() => {
    const q = query.toLowerCase().trim()

    // Sessions section
    const sessionItems: PaletteItem[] = Array.from(sessions.values()).map((s) => {
      const host = hosts.find((h) => h.id === s.hostId)
      const label = host?.label ?? host?.hostname ?? s.hostId
      const subtext = host ? `${host.username}@${host.hostname}:${host.port}` : s.hostId
      return { kind: 'session', id: s.id, label, subtext }
    })

    // Hosts section — filter by query
    const hostItems: PaletteItem[] = hosts
      .filter((h) => {
        if (!q) return true
        return (
          h.label.toLowerCase().includes(q)        ||
          h.hostname.toLowerCase().includes(q)     ||
          h.username.toLowerCase().includes(q)     ||
          h.tags.some((t) => t.toLowerCase().includes(q))
        )
      })
      .map((h) => ({ kind: 'host', host: h }))

    // Static actions — filter by query
    const actionItems: PaletteItem[] = STATIC_ACTIONS
      .filter((a) => !q || a.label.toLowerCase().includes(q) || a.subtext.toLowerCase().includes(q))
      .map((a) => ({ kind: 'action', ...a }))

    return [...sessionItems, ...hostItems, ...actionItems]
  }, [query, sessions, hosts])

  /* Keep cursor in range when list changes */
  useEffect(() => {
    setCursor((c) => Math.min(c, Math.max(0, items.length - 1)))
  }, [items.length])

  /* Scroll active row into view */
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[data-active="true"]')
    el?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  /* Execute the selected item */
  const execute = useCallback((item: PaletteItem) => {
    if (item.kind === 'session') {
      setActiveSession(item.id)
    } else if (item.kind === 'host') {
      onConnect(item.host)
    } else {
      switch (item.id) {
        case 'add-host':   onAddHost();          break
        case 'settings':   onOpenSettings();     break
        case 'vault':      onNavigateVault();    break
        case 'dashboard':  onNavigateDashboard(); break
      }
    }
    onClose()
  }, [setActiveSession, onConnect, onAddHost, onOpenSettings, onNavigateVault, onNavigateDashboard, onClose])

  /* Keyboard navigation */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if      (e.key === 'Escape')    { onClose(); return }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, items.length - 1)) }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      if (items[cursor]) execute(items[cursor])
    }
  }, [items, cursor, onClose, execute])

  if (!isOpen) return null

  /* ── Section boundaries ─────────────────────────────────── */
  const sessionCount = Array.from(sessions.values()).length
  const filteredHostCount = items.filter((i) => i.kind === 'host').length
  const filteredActionCount = items.filter((i) => i.kind === 'action').length

  let globalIndex = -1

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
        role="presentation"
      />

      {/* Palette card */}
      <div
        className="relative z-10 w-full flex flex-col overflow-hidden"
        style={{
          maxWidth: 560,
          background: '#111317',
          border: '1px solid #252a30',
          borderRadius: 8,
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Search row */}
        <div
          className="flex items-center gap-3 px-4"
          style={{ borderBottom: '1px solid #1d2126', height: 48 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#56687a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search hosts, sessions, actions…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0) }}
            className="flex-1 bg-transparent outline-none"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.8125rem',
              color: '#e2e2e6',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="opacity-40 hover:opacity-80 transition-opacity"
              aria-label="Clear"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M4 4L12 12M12 4L4 12" stroke="#8a9bb0" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
          <kbd
            className="shrink-0 text-[0.6rem] font-mono px-1.5 py-0.5 rounded"
            style={{ background: '#1d2126', color: '#56687a', border: '1px solid #252a30' }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto" style={{ maxHeight: 380 }}>
          {items.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-2 py-10"
              style={{ color: '#56687a', fontFamily: "'Inter', sans-serif", fontSize: '0.75rem' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2d3640" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <>
              {/* Sessions */}
              {sessionCount > 0 && (
                <Section label="ACTIVE SESSIONS">
                  {Array.from(sessions.values()).map((s) => {
                    globalIndex++
                    const idx = globalIndex
                    const item = items[idx]
                    if (!item || item.kind !== 'session') return null
                    const isActive = idx === cursor
                    return (
                      <Row
                        key={s.id}
                        isActive={isActive}
                        onClick={() => execute(item)}
                        onMouseEnter={() => setCursor(idx)}
                      >
                        <div
                          className="flex items-center justify-center rounded shrink-0"
                          style={{ width: 28, height: 28, background: 'rgba(34,197,94,0.08)' }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="3" width="20" height="14" rx="2" /><polyline points="8 21 12 17 16 21" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[0.75rem] font-semibold truncate" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#e2e2e6' }}>
                              <Highlight text={item.label} query={query} />
                            </span>
                            <span className="text-[0.55rem] font-mono font-semibold px-1.5 py-0.5 rounded-sm shrink-0" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
                              LIVE
                            </span>
                          </div>
                          <span className="text-[0.625rem] truncate block" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#56687a' }}>
                            {item.subtext}
                          </span>
                        </div>
                        <span className="text-[0.6rem] shrink-0" style={{ color: '#3c494e', fontFamily: "'Inter', sans-serif" }}>SWITCH</span>
                      </Row>
                    )
                  })}
                </Section>
              )}

              {/* Hosts */}
              {filteredHostCount > 0 && (
                <Section label="HOSTS">
                  {items
                    .filter((i): i is Extract<PaletteItem, { kind: 'host' }> => i.kind === 'host')
                    .map((item) => {
                      globalIndex++
                      const idx = globalIndex
                      const isActive = idx === cursor
                      const connectedSessionIds = new Set(Array.from(sessions.values()).map((s) => s.hostId))
                      const isConnected = connectedSessionIds.has(item.host.id)
                      return (
                        <Row
                          key={item.host.id}
                          isActive={isActive}
                          onClick={() => execute(item)}
                          onMouseEnter={() => setCursor(idx)}
                        >
                          <div
                            className="flex items-center justify-center rounded shrink-0"
                            style={{ width: 28, height: 28, background: 'rgba(168,232,255,0.07)' }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a8e8ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="2" y="3" width="20" height="14" rx="2" /><polyline points="8 21 12 17 16 21" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[0.75rem] font-semibold truncate" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#e2e2e6' }}>
                                <Highlight text={item.host.label} query={query} />
                              </span>
                              {isConnected && (
                                <span className="text-[0.55rem] font-mono font-semibold px-1.5 py-0.5 rounded-sm shrink-0" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}>
                                  CONNECTED
                                </span>
                              )}
                              <AuthBadge method={item.host.authMethod} />
                            </div>
                            <span className="text-[0.625rem] truncate block" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#56687a' }}>
                              <Highlight text={`${item.host.username}@${item.host.hostname}:${item.host.port}`} query={query} />
                            </span>
                          </div>
                          <span className="text-[0.6rem] shrink-0" style={{ color: '#3c494e', fontFamily: "'Inter', sans-serif" }}>
                            {isConnected ? 'OPEN' : 'CONNECT'}
                          </span>
                        </Row>
                      )
                    })}
                </Section>
              )}

              {/* Actions */}
              {filteredActionCount > 0 && (
                <Section label="ACTIONS">
                  {items
                    .filter((i): i is Extract<PaletteItem, { kind: 'action' }> => i.kind === 'action')
                    .map((item) => {
                      globalIndex++
                      const idx = globalIndex
                      const isActive = idx === cursor
                      return (
                        <Row
                          key={item.id}
                          isActive={isActive}
                          onClick={() => execute(item)}
                          onMouseEnter={() => setCursor(idx)}
                        >
                          <div
                            className="flex items-center justify-center rounded shrink-0"
                            style={{ width: 28, height: 28, background: 'rgba(138,155,176,0.07)' }}
                          >
                            <ActionIcon name={item.icon} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[0.75rem] font-semibold block truncate" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#e2e2e6' }}>
                              <Highlight text={item.label} query={query} />
                            </span>
                            <span className="text-[0.625rem] block truncate" style={{ fontFamily: "'Inter', sans-serif", color: '#56687a' }}>
                              {item.subtext}
                            </span>
                          </div>
                          <span className="text-[0.6rem] shrink-0" style={{ color: '#3c494e', fontFamily: "'Inter', sans-serif" }}>RUN</span>
                        </Row>
                      )
                    })}
                </Section>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-4 px-4 py-2"
          style={{ borderTop: '1px solid #1d2126', background: '#0c0e11' }}
        >
          <FooterHint keys={['↑', '↓']} label="navigate" />
          <FooterHint keys={['↵']} label="select" />
          <FooterHint keys={['ESC']} label="close" />
        </div>
      </div>
    </div>
  )
}

/* ── Small helpers ──────────────────────────────────────────── */

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="px-4 pt-3 pb-1 text-[0.575rem] font-mono font-semibold tracking-[0.14em]"
        style={{ color: '#3c494e' }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}

function Row({
  isActive,
  onClick,
  onMouseEnter,
  children,
}: {
  isActive: boolean
  onClick: () => void
  onMouseEnter: () => void
  children: React.ReactNode
}) {
  return (
    <button
      data-active={isActive}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left"
      style={{ background: isActive ? 'rgba(168,232,255,0.05)' : 'transparent' }}
    >
      {children}
    </button>
  )
}

function FooterHint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center gap-1">
      {keys.map((k) => (
        <kbd
          key={k}
          className="text-[0.575rem] font-mono px-1 py-0.5 rounded"
          style={{ background: '#1d2126', color: '#56687a', border: '1px solid #252a30' }}
        >
          {k}
        </kbd>
      ))}
      <span className="text-[0.6rem] ml-1" style={{ color: '#3c494e', fontFamily: "'Inter', sans-serif" }}>
        {label}
      </span>
    </div>
  )
}

function AuthBadge({ method }: { method: Host['authMethod'] }) {
  const isKey = method === 'privateKey'
  return (
    <span
      className="flex items-center gap-0.5 text-[0.55rem] font-mono font-semibold tracking-widest px-1.5 py-0.5 rounded-sm shrink-0"
      style={{
        background: isKey ? 'rgba(168,232,255,0.08)' : 'rgba(245,158,11,0.08)',
        color: isKey ? '#a8e8ff' : '#f59e0b',
      }}
    >
      {isKey ? 'KEY' : 'PASS'}
    </span>
  )
}

function ActionIcon({ name }: { name: ActionIconName }) {
  const stroke = '#8a9bb0'
  const props = { width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none', stroke, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (name === 'settings') return (
    <svg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
  if (name === 'plus') return (
    <svg {...props}>
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
  if (name === 'lock') return (
    <svg {...props}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
  if (name === 'home') return (
    <svg {...props}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
  // terminal
  return (
    <svg {...props}>
      <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  )
}

/**
 * Highlights matching substring with cyan accent color.
 */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase().trim())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color: '#a8e8ff' }}>{text.slice(idx, idx + query.trim().length)}</span>
      {text.slice(idx + query.trim().length)}
    </>
  )
}
