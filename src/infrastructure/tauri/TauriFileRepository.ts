import { invoke } from '@tauri-apps/api/core'
import type { FileEntry, Transfer } from '@/domain/entities'
import type { IFileRepository } from '@/domain/repositories'

export class TauriFileRepository implements IFileRepository {
  async listDirectory(sessionId: string, path: string): Promise<FileEntry[]> {
    const entries = await invoke<FileEntry[]>('list_remote_directory', { sessionId, path })
    return entries.map((entry) => ({
      ...entry,
      modifiedAt: new Date(entry.modifiedAt),
    }))
  }

  async uploadFile(sessionId: string, localPath: string, remotePath: string): Promise<Transfer> {
    return await invoke<Transfer>('upload_file', { sessionId, localPath, remotePath })
  }

  async downloadFile(sessionId: string, remotePath: string, localPath: string): Promise<Transfer> {
    return await invoke<Transfer>('download_file', { sessionId, remotePath, localPath })
  }

  async deleteFile(sessionId: string, path: string): Promise<void> {
    await invoke('delete_remote_file', { sessionId, path })
  }

  async renameFile(sessionId: string, oldPath: string, newPath: string): Promise<void> {
    await invoke('rename_remote_file', { sessionId, oldPath, newPath })
  }
}
