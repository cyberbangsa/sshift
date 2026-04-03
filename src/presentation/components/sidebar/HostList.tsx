import type { Host } from '@/domain/entities'
import { HostItem } from './HostItem'

interface HostListProps {
  hosts: Host[]
  selectedHostId: string | null
  connectedHostIds: string[]
  connectingHostId: string | null
  onSelectHost: (id: string) => void
  onConnectHost: (host: Host) => void
  onDeleteHost: (id: string) => void
}

export function HostList({
  hosts,
  selectedHostId,
  connectedHostIds,
  connectingHostId,
  onSelectHost,
  onConnectHost,
  onDeleteHost,
}: HostListProps) {
  if (hosts.length === 0) {
    return (
      <div className="px-3 py-6 text-center text-text-muted text-sm">
        No saved hosts. Click + to add one.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      {hosts.map((host) => (
        <HostItem
          key={host.id}
          host={host}
          isSelected={host.id === selectedHostId}
          isConnected={connectedHostIds.includes(host.id)}
          isConnecting={host.id === connectingHostId}
          onSelect={onSelectHost}
          onConnect={onConnectHost}
          onDelete={onDeleteHost}
        />
      ))}
    </div>
  )
}
