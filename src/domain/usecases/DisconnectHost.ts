import type { ISessionRepository } from '@/domain/repositories'

/** Disconnects an active SSH session. */
export class DisconnectHost {
  private readonly sessionRepository: ISessionRepository
  constructor(sessionRepository: ISessionRepository) {
    this.sessionRepository = sessionRepository
  }

  async execute(sessionId: string): Promise<void> {
    if (!sessionId) {
      throw new Error('Session ID is required')
    }
    await this.sessionRepository.disconnect(sessionId)
  }
}
