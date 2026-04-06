import { invoke } from '@tauri-apps/api/core'
import type { Host, Session } from '@/domain/entities'
import type { ISessionRepository } from '@/domain/repositories'

export class TauriSessionRepository implements ISessionRepository {
  private activeSessions: Map<string, Session> = new Map()

  async connect(host: Host): Promise<Session> {
    const payload = {
      hostId: host.id,
      hostname: host.hostname,
      port: host.port,
      username: host.username,
      authMethod: host.authMethod,
      privateKeyPath: host.privateKeyPath,
      password: host.password ? '***' : undefined,
    }
    console.log('[TauriSessionRepository] connect payload:', JSON.stringify(payload, null, 2))
    console.log(
      '[TauriSessionRepository] full host entity:',
      JSON.stringify(
        {
          ...host,
          password: host.password ? `***[${host.password.length} chars]` : undefined,
        },
        null,
        2,
      ),
    )

    const session = await invoke<Session>('connect_session', {
      hostId: host.id,
      hostname: host.hostname,
      port: host.port,
      username: host.username,
      authMethod: host.authMethod,
      vaultEntryId: host.vaultEntryId,
      publicKeyVaultEntryId: host.publicKeyVaultEntryId,
      privateKeyPath: host.privateKeyPath,
      password: host.password,
      keyPassphrase: host.keyPassphrase,
    })

    const deserialized: Session = {
      ...session,
      connectedAt: session.connectedAt ? new Date(session.connectedAt) : undefined,
    }
    this.activeSessions.set(deserialized.id, deserialized)
    return deserialized
  }

  async disconnect(sessionId: string): Promise<void> {
    await invoke('disconnect_session', { sessionId })
    this.activeSessions.delete(sessionId)
  }

  async executeCommand(sessionId: string, command: string): Promise<string> {
    return await invoke<string>('execute_command', { sessionId, command })
  }

  getActiveSessions(): Session[] {
    return Array.from(this.activeSessions.values())
  }
}
