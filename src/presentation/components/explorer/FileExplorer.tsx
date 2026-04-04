import { useCallback, useEffect, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { FileEntry } from '@/domain/entities'
import { useTransferStore, type TransferItem } from '@/application/stores/transferStore'
import { FilePane } from './FilePane'

interface FileExplorerProps {
  sessionId: string
  hostLabel: string
}

type PaneState = {
  path: string
  entries: FileEntry[]
  loading: boolean
  error: string | null
  selected: FileEntry | null
}

const INITIAL_PANE: PaneState = {
  path: '/',
  entries: [],
  loading: false,
  error: null,
  selected: null,
}

function useTransferBar() {
  const { transfers, watchTransfer, removeTransfer } = useTransferStore()
  const items = Array.from(transfers.values())
  return { items, watchTransfer, removeTransfer }
}

export function FileExplorer({ sessionId, hostLabel }: FileExplorerProps) {
  const [local, setLocal] = useState<PaneState>({ ...INITIAL_PANE })
  const [remote, setRemote] = useState<PaneState>({ ...INITIAL_PANE })
  const { items: transferItems, watchTransfer, removeTransfer } = useTransferBar()
  const { addTransfer } = useTransferStore()
  const unlistenRefs = useRef<Map<string, () => void>>(new Map())

  // ── Drag state ────────────────────────────────────────────────────────────
  // dragOriginRef: ref (instant, no stale closure) used inside event handlers
  // dragOrigin state: mirrors the ref, drives UI re-renders
  const [dragOrigin, setDragOrigin] = useState<'local' | 'remote' | null>(null)
  const dragOriginRef = useRef<'local' | 'remote' | null>(null)
  const [dropTarget, setDropTarget] = useState<'local' | 'remote' | null>(null)
  const dragEntryRef = useRef<FileEntry | null>(null)
  // Counter trick: dragover fires on every child element change,
  // so we use enter/leave counters per pane to avoid flicker
  const dragCounters = useRef({ local: 0, remote: 0 })

  // ── Directory loading ─────────────────────────────────────────────────────

  const loadLocal = useCallback(async (path: string) => {
    setLocal((s) => ({ ...s, loading: true, error: null, selected: null }))
    try {
      const entries = await invoke<FileEntry[]>('list_local_directory', { path })
      setLocal((s) => ({ ...s, entries, path, loading: false }))
    } catch (e) {
      setLocal((s) => ({ ...s, loading: false, error: String(e) }))
    }
  }, [])

  const loadRemote = useCallback(
    async (path: string) => {
      setRemote((s) => ({ ...s, loading: true, error: null, selected: null }))
      try {
        const entries = await invoke<FileEntry[]>('list_remote_directory', {
          sessionId,
          path,
        })
        setRemote((s) => ({ ...s, entries, path, loading: false }))
      } catch (e) {
        setRemote((s) => ({ ...s, loading: false, error: String(e) }))
      }
    },
    [sessionId],
  )

  // ── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    invoke<string>('get_home_directory')
      .then((home) => loadLocal(home))
      .catch(() => loadLocal('/'))
    loadRemote('/')
  }, [loadLocal, loadRemote])

  // Cleanup event listeners on unmount
  useEffect(() => {
    const refs = unlistenRefs.current
    return () => {
      refs.forEach((fn) => fn())
      refs.clear()
    }
  }, [])

  // ── Transfer helpers ──────────────────────────────────────────────────────

  const startTransfer = useCallback(
    async (
      direction: 'upload' | 'download',
      srcEntry: FileEntry,
      destDir: string,
    ) => {
      if (srcEntry.type !== 'file') return

      const transferId = crypto.randomUUID()
      const filename = srcEntry.name
      const destPath = destDir.replace(/\/$/, '') + '/' + filename

      const item: TransferItem = {
        id: transferId,
        sessionId,
        filename,
        sourcePath: srcEntry.path,
        destPath,
        direction,
        status: 'active',
        progress: 0,
        bytesTransferred: 0,
        totalBytes: srcEntry.size,
      }
      addTransfer(item)

      // Subscribe to progress events
      const unlisten = await watchTransfer(transferId)
      unlistenRefs.current.set(transferId, unlisten)

      try {
        if (direction === 'upload') {
          await invoke('upload_file', {
            sessionId,
            localPath: srcEntry.path,
            remotePath: destPath,
            transferId,
          })
        } else {
          await invoke('download_file', {
            sessionId,
            remotePath: srcEntry.path,
            localPath: destPath,
            transferId,
          })
        }
      } catch (e) {
        useTransferStore.getState().updateTransfer(transferId, { status: 'failed', error: String(e) })
      }

      // After a short delay, refresh the destination pane and clean up listener
      setTimeout(() => {
        if (direction === 'upload') loadRemote(remote.path)
        else loadLocal(local.path)

        const ul = unlistenRefs.current.get(transferId)
        if (ul) {
          ul()
          unlistenRefs.current.delete(transferId)
        }
        // Remove completed/failed transfers after 4 s
        setTimeout(() => removeTransfer(transferId), 4000)
      }, 800)
    },
    [sessionId, addTransfer, watchTransfer, removeTransfer, local.path, remote.path, loadLocal, loadRemote],
  )

  // ── Drag & drop handlers ──────────────────────────────────────────────────

  const handleDragStart = useCallback(
    (side: 'local' | 'remote') =>
      (entry: FileEntry, e: React.DragEvent<HTMLDivElement>) => {
        dragEntryRef.current = entry
        dragOriginRef.current = side   // ref: instant, no stale closure
        setDragOrigin(side)            // state: for UI
        e.dataTransfer.effectAllowed = 'copy'
      },
    [],
  )

  const handleDragOver = useCallback(
    (targetSide: 'local' | 'remote') =>
      (e: React.DragEvent<HTMLDivElement>) => {
        // Always preventDefault — required for drop to fire.
        // Use the ref so we always have the current origin, not a stale closure.
        const origin = dragOriginRef.current
        if (origin !== null && origin !== targetSide) {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'copy'
        }
      },
    [],
  )

  const handleDragEnter = useCallback(
    (targetSide: 'local' | 'remote') =>
      (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        dragCounters.current[targetSide]++
        const origin = dragOriginRef.current
        if (origin !== null && origin !== targetSide) {
          setDropTarget(targetSide)
        }
      },
    [],
  )

  const handleDragLeave = useCallback(
    (targetSide: 'local' | 'remote') =>
      (_e: React.DragEvent<HTMLDivElement>) => {
        dragCounters.current[targetSide]--
        if (dragCounters.current[targetSide] <= 0) {
          dragCounters.current[targetSide] = 0
          setDropTarget((prev) => (prev === targetSide ? null : prev))
        }
      },
    [],
  )

  const handleDrop = useCallback(
    (targetSide: 'local' | 'remote') =>
      (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        dragCounters.current[targetSide] = 0
        setDropTarget(null)
        setDragOrigin(null)

        // Use ref — guaranteed current value, no stale closure
        const origin = dragOriginRef.current
        dragOriginRef.current = null
        const entry = dragEntryRef.current
        dragEntryRef.current = null

        if (!entry || entry.type !== 'file') return
        if (origin === null || origin === targetSide) return

        if (targetSide === 'remote') {
          startTransfer('upload', entry, remote.path)
        } else {
          startTransfer('download', entry, local.path)
        }
      },
    [local.path, remote.path, startTransfer],
  )

  const handleDragEnd = useCallback(() => {
    dragCounters.current = { local: 0, remote: 0 }
    dragOriginRef.current = null
    setDragOrigin(null)
    setDropTarget(null)
    dragEntryRef.current = null
  }, [])

  // ── Action button states ──────────────────────────────────────────────────

  const canUpload = local.selected?.type === 'file'
  const canDownload = remote.selected?.type === 'file'

  const handleUpload = () => {
    if (local.selected) startTransfer('upload', local.selected, remote.path)
  }
  const handleDownload = () => {
    if (remote.selected) startTransfer('download', remote.selected, local.path)
  }

  const handleDeleteRemote = async () => {
    if (!remote.selected) return
    try {
      await invoke('delete_remote_file', { sessionId, path: remote.selected.path })
      loadRemote(remote.path)
    } catch (e) {
      setRemote((s) => ({ ...s, error: String(e) }))
    }
  }

  // ── Active transfers bar ──────────────────────────────────────────────────

  const activeTransfers = transferItems.filter(
    (t) => t.sessionId === sessionId && (t.status === 'active' || t.status === 'failed'),
  )

  return (
    <div className="flex flex-col h-full" style={{ background: '#0f1115' }}>
      {/* ── Main dual pane ────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Local pane */}
        <div className="flex-1 min-w-0" onDragEnd={handleDragEnd}>
          <FilePane
            side="local"
            label="This Mac"
            currentPath={local.path}
            entries={local.entries}
            isLoading={local.loading}
            error={local.error}
            selectedPath={local.selected?.path ?? null}
            isDragOver={dropTarget === 'local'}
            onNavigate={loadLocal}
            onSelect={(e) => setLocal((s) => ({ ...s, selected: e }))}
            onRefresh={() => loadLocal(local.path)}
            onDragStart={handleDragStart('local')}
            onDragOver={handleDragOver('local')}
            onDragEnter={handleDragEnter('local')}
            onDragLeave={handleDragLeave('local')}
            onDrop={handleDrop('local')}
          />
        </div>

        {/* ── Middle action bar ──────────────────────────────────────── */}
        {(() => {
          const isDraggingToRemote = dragOrigin === 'local'  // local → remote = upload
          const isDraggingToLocal  = dragOrigin === 'remote' // remote → local = download
          const isDragging = dragOrigin !== null

          return (
            <div
              className="flex flex-col items-center justify-center gap-2 shrink-0"
              style={{
                width: 52,
                background: '#0c0e11',
                borderLeft:  `1px solid ${isDragging ? (isDraggingToRemote ? 'rgba(168,232,255,0.25)' : 'rgba(125,211,252,0.25)') : '#1d2126'}`,
                borderRight: `1px solid ${isDragging ? (isDraggingToRemote ? 'rgba(168,232,255,0.25)' : 'rgba(125,211,252,0.25)') : '#1d2126'}`,
                transition: 'border-color 0.2s',
              }}
            >
              {/* Drag-direction indicator — only visible while dragging */}
              <div
                style={{
                  height: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isDragging ? 1 : 0,
                  transition: 'opacity 0.15s',
                  animation: isDragging ? 'pulse 1.2s ease-in-out infinite' : 'none',
                  color: isDraggingToRemote ? '#a8e8ff' : '#7dd3fc',
                  fontSize: '1rem',
                  fontWeight: 700,
                  pointerEvents: 'none',
                }}
              >
                {isDraggingToRemote ? '→' : '←'}
              </div>

              {/* Upload ↑ */}
              <button
                onClick={handleUpload}
                disabled={!canUpload && !isDraggingToRemote}
                title={canUpload ? `Upload ${local.selected?.name} → remote` : 'Select a local file first'}
                className="flex flex-col items-center gap-1 px-2 py-2 rounded transition-all"
                style={{
                  color: isDraggingToRemote ? '#a8e8ff' : canUpload ? '#a8e8ff' : '#2a3a4a',
                  background: isDraggingToRemote
                    ? 'rgba(168,232,255,0.15)'
                    : canUpload ? 'rgba(168,232,255,0.07)' : 'transparent',
                  border: `1px solid ${isDraggingToRemote ? 'rgba(168,232,255,0.45)' : canUpload ? 'rgba(168,232,255,0.2)' : 'transparent'}`,
                  cursor: canUpload ? 'pointer' : 'default',
                  boxShadow: isDraggingToRemote ? '0 0 8px rgba(168,232,255,0.3)' : 'none',
                  transform: isDraggingToRemote ? 'scale(1.08)' : 'scale(1)',
                  transition: 'all 0.2s',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
                <span style={{ fontSize: '0.5rem', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em' }}>
                  UP
                </span>
              </button>

              {/* Separator */}
              <div style={{ width: 20, height: 1, background: '#1d2126' }} />

              {/* Download ↓ */}
              <button
                onClick={handleDownload}
                disabled={!canDownload && !isDraggingToLocal}
                title={canDownload ? `Download ${remote.selected?.name} → local` : 'Select a remote file first'}
                className="flex flex-col items-center gap-1 px-2 py-2 rounded transition-all"
                style={{
                  color: isDraggingToLocal ? '#7dd3fc' : canDownload ? '#7dd3fc' : '#2a3a4a',
                  background: isDraggingToLocal
                    ? 'rgba(125,211,252,0.15)'
                    : canDownload ? 'rgba(125,211,252,0.07)' : 'transparent',
                  border: `1px solid ${isDraggingToLocal ? 'rgba(125,211,252,0.45)' : canDownload ? 'rgba(125,211,252,0.2)' : 'transparent'}`,
                  cursor: canDownload ? 'pointer' : 'default',
                  boxShadow: isDraggingToLocal ? '0 0 8px rgba(125,211,252,0.3)' : 'none',
                  transform: isDraggingToLocal ? 'scale(1.08)' : 'scale(1)',
                  transition: 'all 0.2s',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span style={{ fontSize: '0.5rem', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em' }}>
                  DOWN
                </span>
              </button>

              {/* Delete remote */}
              <div style={{ width: 20, height: 1, background: '#1d2126' }} />
              <button
                onClick={handleDeleteRemote}
                disabled={!remote.selected}
                title={remote.selected ? `Delete ${remote.selected.name}` : 'Select a remote item first'}
                className="flex flex-col items-center gap-1 px-2 py-2 rounded transition-all"
                style={{
                  color: remote.selected ? '#f87171' : '#2a3a4a',
                  background: remote.selected ? 'rgba(248,113,113,0.07)' : 'transparent',
                  border: `1px solid ${remote.selected ? 'rgba(248,113,113,0.2)' : 'transparent'}`,
                  cursor: remote.selected ? 'pointer' : 'not-allowed',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
                <span style={{ fontSize: '0.5rem', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em' }}>
                  DEL
                </span>
              </button>
            </div>
          )
        })()}

        {/* Remote pane */}
        <div className="flex-1 min-w-0" onDragEnd={handleDragEnd}>
          <FilePane
            side="remote"
            label={hostLabel}
            currentPath={remote.path}
            entries={remote.entries}
            isLoading={remote.loading}
            error={remote.error}
            selectedPath={remote.selected?.path ?? null}
            isDragOver={dropTarget === 'remote'}
            onNavigate={loadRemote}
            onSelect={(e) => setRemote((s) => ({ ...s, selected: e }))}
            onRefresh={() => loadRemote(remote.path)}
            onDragStart={handleDragStart('remote')}
            onDragOver={handleDragOver('remote')}
            onDragEnter={handleDragEnter('remote')}
            onDragLeave={handleDragLeave('remote')}
            onDrop={handleDrop('remote')}
          />
        </div>
      </div>

      {/* ── Transfer progress bar ──────────────────────────────────────── */}
      {activeTransfers.length > 0 && (
        <div
          className="shrink-0"
          style={{
            borderTop: '1px solid #1d2126',
            background: '#0c0e11',
            maxHeight: 100,
            overflowY: 'auto',
          }}
        >
          {activeTransfers.map((t) => (
            <TransferRow key={t.id} transfer={t} onDismiss={() => removeTransfer(t.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Transfer progress row ─────────────────────────────────────────────────────

function TransferRow({
  transfer,
  onDismiss,
}: {
  transfer: TransferItem
  onDismiss: () => void
}) {
  const isFailed = transfer.status === 'failed'
  const isComplete = transfer.status === 'complete'
  const barColor = isFailed ? '#f87171' : isComplete ? '#22c55e' : '#a8e8ff'

  function formatBytes(b: number) {
    if (b < 1024) return `${b} B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div
      className="flex items-center gap-2 px-3"
      style={{ height: 28, borderBottom: '1px solid #16191e' }}
    >
      {/* Direction arrow */}
      <span style={{ color: barColor, fontSize: '0.65rem', fontFamily: "'JetBrains Mono', monospace" }}>
        {transfer.direction === 'upload' ? '↑' : '↓'}
      </span>

      {/* Filename */}
      <span
        style={{
          color: '#8a9bb0',
          fontSize: '0.68rem',
          fontFamily: "'JetBrains Mono', monospace",
          minWidth: 120,
          maxWidth: 160,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {transfer.filename}
      </span>

      {/* Progress bar */}
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height: 3, background: '#1d2126' }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${transfer.progress}%`, background: barColor }}
        />
      </div>

      {/* Percentage */}
      <span
        style={{ color: barColor, fontSize: '0.62rem', fontFamily: "'JetBrains Mono', monospace", minWidth: 32, textAlign: 'right' }}
      >
        {isFailed ? 'ERR' : `${Math.round(transfer.progress)}%`}
      </span>

      {/* Bytes */}
      {!isFailed && (
        <span style={{ color: '#3a4a5a', fontSize: '0.6rem', fontFamily: "'JetBrains Mono', monospace", minWidth: 60, textAlign: 'right' }}>
          {formatBytes(transfer.bytesTransferred)}
          {transfer.totalBytes > 0 ? ` / ${formatBytes(transfer.totalBytes)}` : ''}
        </span>
      )}

      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        style={{ color: '#2a3a4a', marginLeft: 4 }}
        className="hover:text-white transition-colors"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}

