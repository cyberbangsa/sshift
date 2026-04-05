import type { FileEntry } from '@/domain/entities'

interface FileTreeProps {
  entries: FileEntry[]
  currentPath: string
  selectedPath: string | null
  onNavigate: (path: string) => void
  onSelect: (entry: FileEntry) => void
  onDragStart?: (entry: FileEntry, e: React.DragEvent<HTMLDivElement>) => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function FileTree({ entries, currentPath, selectedPath, onNavigate, onSelect, onDragStart }: FileTreeProps) {
  const handleClick = (entry: FileEntry) => {
    if (entry.type === 'directory') {
      onNavigate(entry.path)
    } else {
      onSelect(entry)
    }
  }

  return (
    <div className="flex flex-col">
      {currentPath && currentPath !== '/' && currentPath !== '' && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer"
          style={{ color: '#56687a', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem' }}
          onClick={() => {
            const parent = currentPath.split('/').slice(0, -1).join('/') || '/'
            onNavigate(parent)
          }}
          role="button"
          tabIndex={0}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>..</span>
        </div>
      )}
      {entries.map((entry) => {
        const isSelected = selectedPath === entry.path
        const isDir = entry.type === 'directory'
        return (
          <div
            key={entry.path}
            className="flex items-center gap-2 px-3 py-1 cursor-pointer transition-colors"
            style={{
              background: isSelected ? 'rgba(168,232,255,0.08)' : 'transparent',
              borderLeft: isSelected ? '2px solid #a8e8ff' : '2px solid transparent',
              fontSize: '0.72rem',
              fontFamily: "'JetBrains Mono', monospace",
            }}
            onClick={() => handleClick(entry)}
            draggable={!isDir}
            onDragStart={(e) => {
              if (isDir) { e.preventDefault(); return }
              e.dataTransfer.effectAllowed = 'copy'
              e.dataTransfer.setData('text/plain', entry.path)
              onDragStart?.(entry, e)
            }}
            role="button"
            tabIndex={0}
          >
            {/* Icon */}
            {isDir ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#56687a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#56687a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" />
              </svg>
            )}

            {/* Name */}
            <span
              className="flex-1 truncate"
              style={{ color: isDir ? '#a8e8ff' : '#c8dae8' }}
            >
              {entry.name}
            </span>

            {/* Size (files only) */}
            {!isDir && (
              <span style={{ color: '#56687a', minWidth: '4rem', textAlign: 'right' }}>
                {formatSize(entry.size)}
              </span>
            )}

            {/* Perms */}
            <span style={{ color: '#3a4a5a', minWidth: '5.5rem', textAlign: 'right' }}>
              {entry.permissions}
            </span>
          </div>
        )
      })}
    </div>
  )
}
