import type { Host } from '@/domain/entities'
import { Badge, Button, Icon } from '@/presentation/shared'

interface HostItemProps {
  host: Host
  isSelected: boolean
  isConnected: boolean
  isConnecting: boolean
  onSelect: (id: string) => void
  onConnect: (host: Host) => void
  onDelete: (id: string) => void
}

export function HostItem({
  host,
  isSelected,
  isConnected,
  isConnecting,
  onSelect,
  onConnect,
  onDelete,
}: HostItemProps) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors
        ${isSelected ? 'bg-surface-tertiary' : 'hover:bg-surface-tertiary/50'}`}
      onClick={() => onSelect(host.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSelect(host.id)
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary truncate">{host.label}</span>
          {isConnected && <Badge variant="success">Connected</Badge>}
          {isConnecting && (
            <span
              className="text-[0.6rem] font-semibold tracking-wider"
              style={{ color: '#a8e8ff' }}
            >
              CONNECTING…
            </span>
          )}
        </div>
        <span className="text-xs text-text-muted truncate block">
          {host.username}@{host.hostname}:{host.port}
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            if (!isConnecting) onConnect(host)
          }}
          aria-label={isConnecting ? 'Connecting…' : isConnected ? 'Reconnect' : 'Connect'}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#a8e8ff"
              strokeWidth="2"
              strokeLinecap="round"
              style={{ animation: 'spin 1s linear infinite' }}
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <Icon name="terminal" size={14} />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(host.id)
          }}
          aria-label="Delete host"
          disabled={isConnecting}
        >
          <Icon name="trash" size={14} />
        </Button>
      </div>
    </div>
  )
}
