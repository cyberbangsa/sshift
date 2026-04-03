import type { Transfer } from '@/domain/entities'
import type { IFileRepository } from '@/domain/repositories'

export class TransferError extends Error {
  constructor(message: string, public readonly sessionId: string) {
    super(message)
    this.name = 'TransferError'
  }
}

/** Initiates a file transfer (upload or download) between local and remote host. */
export class TransferFile {
  constructor(private readonly fileRepository: IFileRepository) {}

  async execute(
    sessionId: string,
    sourcePath: string,
    destinationPath: string,
    direction: 'upload' | 'download',
  ): Promise<Transfer> {
    if (!sourcePath || !destinationPath) {
      throw new TransferError('Source and destination paths are required', sessionId)
    }

    try {
      if (direction === 'upload') {
        return await this.fileRepository.uploadFile(sessionId, sourcePath, destinationPath)
      } else {
        return await this.fileRepository.downloadFile(sessionId, sourcePath, destinationPath)
      }
    } catch (error) {
      throw new TransferError(
        error instanceof Error ? error.message : 'Unknown transfer error',
        sessionId,
      )
    }
  }
}
