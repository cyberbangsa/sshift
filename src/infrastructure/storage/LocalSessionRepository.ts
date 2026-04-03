import type { Host, Session } from '@/domain/entities'
import type { ISessionRepository } from '@/domain/repositories'
import { DEFAULT_REMOTE_PATH } from '@/config'

/**
 * Browser / dev-mode session repository.
 * Creates Session objects locally without calling the Tauri backend,
 * so the dashboard → active-session navigation works in `npm run dev`.
 * In production the TauriSessionRepository is used instead.
 */
export class LocalSessionRepository implements ISessionRepository {
  private sessions: Map<string, Session> = new Map()

  async connect(host: Host): Promise<Session> {
    // Simulate a brief connection handshake
    await new Promise((r) => setTimeout(r, 250))

    const session: Session = {
      id: crypto.randomUUID(),
      hostId: host.id,
      status: 'connected',
      connectedAt: new Date(),
      latencyMs: Math.round(Math.random() * 25 + 5),
      currentPath: DEFAULT_REMOTE_PATH,
    }
    this.sessions.set(session.id, session)
    return session
  }

  async disconnect(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId)
  }

  async executeCommand(_sessionId: string, _command: string): Promise<string> {
    // Commands will be routed through the Tauri layer when available
    return ''
  }

  getActiveSessions(): Session[] {
    return Array.from(this.sessions.values())
  }
}
