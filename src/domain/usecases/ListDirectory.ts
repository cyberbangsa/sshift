import type { FileEntry } from '@/domain/entities'
import type { IFileRepository } from '@/domain/repositories'

/** Lists the contents of a remote directory. */
export class ListDirectory {
  constructor(private readonly fileRepository: IFileRepository) {}

  async execute(sessionId: string, path: string): Promise<FileEntry[]> {
    const entries = await this.fileRepository.listDirectory(sessionId, path)
    return entries.sort((a, b) => {
      if (a.type === 'directory' && b.type !== 'directory') return -1
      if (a.type !== 'directory' && b.type === 'directory') return 1
      return a.name.localeCompare(b.name)
    })
  }
}
