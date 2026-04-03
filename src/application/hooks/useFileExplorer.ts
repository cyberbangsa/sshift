import { useCallback, useState } from 'react'
import type { FileEntry } from '@/domain/entities'
import { ListDirectory } from '@/domain/usecases'
import type { IFileRepository } from '@/domain/repositories'

export function useFileExplorer(repository: IFileRepository) {
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [currentPath, setCurrentPath] = useState('/')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const listDirectory = useCallback(
    async (sessionId: string, path: string) => {
      setIsLoading(true)
      setError(null)
      try {
        const useCase = new ListDirectory(repository)
        const result = await useCase.execute(sessionId, path)
        setEntries(result)
        setCurrentPath(path)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to list directory')
      } finally {
        setIsLoading(false)
      }
    },
    [repository],
  )

  const deleteFile = useCallback(
    async (sessionId: string, path: string) => {
      await repository.deleteFile(sessionId, path)
    },
    [repository],
  )

  const renameFile = useCallback(
    async (sessionId: string, oldPath: string, newPath: string) => {
      await repository.renameFile(sessionId, oldPath, newPath)
    },
    [repository],
  )

  return {
    entries,
    currentPath,
    isLoading,
    error,
    listDirectory,
    deleteFile,
    renameFile,
  }
}
