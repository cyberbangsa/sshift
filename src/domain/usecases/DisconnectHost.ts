import type { ISessionRepository } from '@/domain/repositories'

/** Disconnects an active SSH session. */
export class DisconnectHost {
  constructor(private readonly sessionRepository: ISessionRepository) {}

  async execute(sessionId: string): Promise<void> {
    if (!sessionId) {
      throw new Error('Session ID is required')
    }
    await this.sessionRepository.disconnect(sessionId)
  }
}
