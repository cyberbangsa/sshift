export interface Session {
  id: string
  hostId: string
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
  connectedAt?: Date
  latencyMs?: number
  currentPath: string
}
