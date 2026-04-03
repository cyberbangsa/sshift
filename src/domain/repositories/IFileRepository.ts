import type { FileEntry, Transfer } from '@/domain/entities'

export interface IFileRepository {
  listDirectory(sessionId: string, path: string): Promise<FileEntry[]>
  uploadFile(sessionId: string, localPath: string, remotePath: string): Promise<Transfer>
  downloadFile(sessionId: string, remotePath: string, localPath: string): Promise<Transfer>
  deleteFile(sessionId: string, path: string): Promise<void>
  renameFile(sessionId: string, oldPath: string, newPath: string): Promise<void>
}
