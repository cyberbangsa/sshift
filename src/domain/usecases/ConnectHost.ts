import type { Host, Session } from '@/domain/entities'
import type { ISessionRepository } from '@/domain/repositories'

export class ConnectionError extends Error {
  constructor(message: string, public readonly hostId: string) {
    super(message)
    this.name = 'ConnectionError'
  }
}

/** Establishes an SSH session to a remote host. */
export class ConnectHost {
  constructor(private readonly sessionRepository: ISessionRepository) { }

  async execute(host: Host): Promise<Session> {
    if (!host.hostname || !host.username) {
      throw new ConnectionError('Host must have a hostname and username', host.id)
    }

    if (host.port < 1 || host.port > 65535) {
      throw new ConnectionError(`Invalid port: ${host.port}`, host.id)
    }

    try {
      const session = await this.sessionRepository.connect(host)
      return session
    } catch (error) {
      // Tauri invoke errors arrive as plain strings, not Error instances
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : JSON.stringify(error)
      throw new ConnectionError(message, host.id)
    }
  }
}
