import type { Transfer } from '@/domain/entities'
import { Badge, Icon } from '@/presentation/shared'

interface TransferQueueProps {
  transfers: Transfer[]
}

function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond < 1024) return `${bytesPerSecond} B/s`
  if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`
  return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`
}

const statusVariant: Record<Transfer['status'], 'info' | 'success' | 'warning' | 'danger'> = {
  pending: 'info',
  active: 'warning',
  complete: 'success',
  failed: 'danger',
}

export function TransferQueue({ transfers }: TransferQueueProps) {
  if (transfers.length === 0) {
    return <div className="px-3 py-6 text-center text-text-muted text-sm">No active transfers</div>
  }

  return (
    <div className="flex flex-col gap-1">
      {transfers.map((transfer) => (
        <div
          key={transfer.id}
          className="flex flex-col gap-1 px-3 py-2 border-b border-border-default"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Icon
                name={transfer.direction === 'upload' ? 'upload' : 'download'}
                size={12}
                className="shrink-0"
              />
              <span className="text-sm text-text-primary truncate">
                {transfer.sourcePath.split('/').pop()}
              </span>
            </div>
            <Badge variant={statusVariant[transfer.status]}>{transfer.status}</Badge>
          </div>
          {transfer.status === 'active' && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-surface-tertiary overflow-hidden">
                <div
                  className="h-full bg-accent-primary rounded-full transition-all"
                  style={{ width: `${transfer.progress}%` }}
                />
              </div>
              <span className="text-xs text-text-muted shrink-0">
                {transfer.progress.toFixed(0)}% &middot; {formatSpeed(transfer.bytesPerSecond)}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
