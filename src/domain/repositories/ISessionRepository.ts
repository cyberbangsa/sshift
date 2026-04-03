import type { Host, Session } from '@/domain/entities'

export interface ISessionRepository {
  connect(host: Host): Promise<Session>
  disconnect(sessionId: string): Promise<void>
  executeCommand(sessionId: string, command: string): Promise<string>
  getActiveSessions(): Session[]
}
