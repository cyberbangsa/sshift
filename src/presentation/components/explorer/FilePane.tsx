import { useCallback } from 'react'
import type { FileEntry } from '@/domain/entities'
import { FileTree } from './FileTree'

interface FilePaneProps {
  /** "LOCAL" or "REMOTE" */
  side: 'local' | 'remote'
  label: string
  currentPath: string
  entries: FileEntry[]
  isLoading: boolean
  error: string | null
  selectedPath: string | null
  onNavigate: (path: string) => void
  onSelect: (entry: FileEntry | null) => void
  onRefresh: () => void
}

export function FilePane({
  side,
  label,
  currentPath,
  entries,
  isLoading,
  error,
  selectedPath,
  onNavigate,
  onSelect,
  onRefresh,
}: FilePaneProps) {
  const accentColor = side === 'local' ? '#7dd3fc' : '#a8e8ff'
  const sideLabel = side === 'local' ? 'LOCAL' : 'REMOTE'

  const handleSelect = useCallback(
    (entry: FileEntry) => {
      onSelect(selectedPath === entry.path ? null : entry)
    },
    [selectedPath, onSelect],
  )

  // Build breadcrumbs from path string
  const segments = currentPath.replace(/\\/g, '/').split('/').filter(Boolean)
  const isRoot = currentPath === '/' || currentPath === '' || segments.length === 0

  const navigateToSegment = (idx: number) => {
    if (idx < 0) {
      onNavigate('/')
      return
    }
    const newPath = '/' + segments.slice(0, idx + 1).join('/')
    onNavigate(newPath)
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: '#0f1115', borderLeft: side === 'remote' ? '1px solid #1d2126' : 'none' }}
    >
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-3 shrink-0"
        style={{ height: 36, borderBottom: '1px solid #1d2126', background: '#111317' }}
      >
        {/* Side badge */}
        <span
          className="text-[0.6rem] font-bold tracking-widest px-1.5 py-0.5 rounded-sm"
          style={{
            color: accentColor,
            border: `1px solid ${accentColor}`,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {sideLabel}
        </span>

        {/* Breadcrumbs */}
        <div
          className="flex items-center gap-0.5 flex-1 overflow-hidden"
          style={{ color: '#56687a', fontSize: '0.68rem', fontFamily: "'JetBrains Mono', monospace" }}
        >
          <button
            onClick={() => navigateToSegment(-1)}
            className="hover:text-white transition-colors"
            style={{ color: isRoot ? accentColor : '#56687a' }}
          >
            /
          </button>
          {segments.map((seg, i) => (
            <span key={i} className="flex items-center gap-0.5">
              <span style={{ color: '#2a3a4a' }}>/</span>
              <button
                onClick={() => navigateToSegment(i)}
                className="hover:text-white transition-colors truncate max-w-20"
                style={{ color: i === segments.length - 1 ? '#c8dae8' : '#56687a' }}
              >
                {seg}
              </button>
            </span>
          ))}
        </div>

        {/* Custom label (hostname, etc.) */}
        <span
          style={{ color: '#3a4a5a', fontSize: '0.6rem', fontFamily: "'JetBrains Mono', monospace" }}
          className="truncate max-w-24 shrink-0"
        >
          {label}
        </span>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          className="shrink-0 transition-colors"
          style={{ color: '#56687a' }}
          title="Refresh"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={isLoading ? { animation: 'spin 0.8s linear infinite' } : {}}
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>

      {/* ── Column header ─────────────────────────────────────────────── */}
      <div
        className="flex items-center px-3"
        style={{
          height: 22,
          borderBottom: '1px solid #1d2126',
          background: '#0c0e11',
          fontSize: '0.58rem',
          fontFamily: "'JetBrains Mono', monospace",
          color: '#3a4a5a',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        <span className="w-3.5" /> {/* icon placeholder */}
        <span className="flex-1 ml-2">Name</span>
        <span style={{ minWidth: '4rem', textAlign: 'right' }}>Size</span>
        <span style={{ minWidth: '5.5rem', textAlign: 'right' }}>Perms</span>
      </div>

      {/* ── File list ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        {error ? (
          <div
            className="flex items-start gap-2 mx-3 mt-3 px-3 py-2 rounded"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span style={{ color: '#ef4444', fontSize: '0.68rem', fontFamily: "'JetBrains Mono', monospace" }}>
              {error}
            </span>
          </div>
        ) : isLoading ? (
          <div
            className="flex items-center justify-center h-20"
            style={{ color: '#56687a', fontSize: '0.7rem', fontFamily: "'JetBrains Mono', monospace" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 0.8s linear infinite', marginRight: 6 }}>
              <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
              <line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
            </svg>
            Loading…
          </div>
        ) : entries.length === 0 ? (
          <div
            className="flex items-center justify-center h-20"
            style={{ color: '#3a4a5a', fontSize: '0.68rem', fontFamily: "'JetBrains Mono', monospace" }}
          >
            Empty directory
          </div>
        ) : (
          <FileTree
            entries={entries}
            currentPath={currentPath}
            selectedPath={selectedPath}
            onNavigate={onNavigate}
            onSelect={handleSelect}
          />
        )}
      </div>

      {/* ── Footer: item count + selected info ────────────────────────── */}
      <div
        className="shrink-0 px-3 flex items-center justify-between"
        style={{
          height: 22,
          borderTop: '1px solid #1d2126',
          background: '#0c0e11',
          fontSize: '0.58rem',
          fontFamily: "'JetBrains Mono', monospace",
          color: '#3a4a5a',
        }}
      >
        <span>{entries.length} items</span>
        {selectedPath && (
          <span style={{ color: accentColor, maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedPath.split('/').pop() ?? selectedPath}
          </span>
        )}
      </div>
    </div>
  )
}
