import type { FileEntry } from '@/domain/entities'
import { Button, Icon } from '@/presentation/shared'
import { FileTree } from './FileTree'

interface FileExplorerProps {
  sessionId: string
  entries: FileEntry[]
  currentPath: string
  isLoading: boolean
  onNavigate: (path: string) => void
  onUpload: () => void
  onDownload: (entry: FileEntry) => void
  onDelete: (entry: FileEntry) => void
}

export function FileExplorer({
  sessionId: _sessionId,
  entries,
  currentPath,
  isLoading,
  onNavigate,
  onUpload,
  onDownload,
  onDelete,
}: FileExplorerProps) {
  const pathSegments = currentPath.split('/').filter(Boolean)

  return (
    <div className="flex flex-col h-full bg-surface-secondary border-l border-border-default">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-default">
        <div className="flex items-center gap-1 text-xs text-text-secondary overflow-hidden">
          <button
            onClick={() => onNavigate('/')}
            className="hover:text-text-primary transition-colors shrink-0"
          >
            /
          </button>
          {pathSegments.map((segment, i) => (
            <span key={i} className="flex items-center gap-1">
              <Icon name="chevron-right" size={10} />
              <button
                onClick={() => onNavigate('/' + pathSegments.slice(0, i + 1).join('/'))}
                className="hover:text-text-primary transition-colors truncate"
              >
                {segment}
              </button>
            </span>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={onUpload} aria-label="Upload file">
          <Icon name="upload" size={14} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-text-muted text-sm">
            Loading...
          </div>
        ) : (
          <FileTree
            entries={entries}
            currentPath={currentPath}
            onNavigate={onNavigate}
            onSelect={(entry) => {
              if (entry.type === 'file') onDownload(entry)
            }}
          />
        )}
      </div>

      {entries.length > 0 && (
        <div className="border-t border-border-default px-3 py-1.5 text-xs text-text-muted">
          {entries.length} items
        </div>
      )}
    </div>
  )
}
