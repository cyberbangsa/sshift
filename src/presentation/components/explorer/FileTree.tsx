import type { FileEntry } from '@/domain/entities'
import { Icon } from '@/presentation/shared'

interface FileTreeProps {
  entries: FileEntry[]
  currentPath: string
  onNavigate: (path: string) => void
  onSelect: (entry: FileEntry) => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function FileTree({ entries, currentPath, onNavigate, onSelect }: FileTreeProps) {
  const handleClick = (entry: FileEntry) => {
    if (entry.type === 'directory') {
      onNavigate(entry.path)
    } else {
      onSelect(entry)
    }
  }

  return (
    <div className="flex flex-col">
      {currentPath !== '/' && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-muted cursor-pointer hover:bg-surface-tertiary/50"
          onClick={() => {
            const parent = currentPath.split('/').slice(0, -1).join('/') || '/'
            onNavigate(parent)
          }}
          role="button"
          tabIndex={0}
        >
          <span>..</span>
        </div>
      )}
      {entries.map((entry) => (
        <div
          key={entry.path}
          className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-surface-tertiary/50 transition-colors"
          onClick={() => handleClick(entry)}
          role="button"
          tabIndex={0}
        >
          <Icon
            name={entry.type === 'directory' ? 'folder' : 'chevron-right'}
            size={14}
            className={entry.type === 'directory' ? 'text-accent-warning' : 'text-text-muted'}
          />
          <span className="flex-1 truncate text-text-primary">{entry.name}</span>
          <span className="text-xs text-text-muted shrink-0">{entry.permissions}</span>
          {entry.type === 'file' && (
            <span className="text-xs text-text-muted shrink-0">{formatSize(entry.size)}</span>
          )}
        </div>
      ))}
    </div>
  )
}
