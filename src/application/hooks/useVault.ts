import { useCallback } from 'react'
import { useVaultStore } from '@/application/stores'
import type { VaultEntryType } from '@/domain/entities'
import type { IVaultRepository } from '@/domain/repositories'

export function useVault(repository: IVaultRepository) {
  const { entries, isLoading, error, setEntries, addEntry, updateEntry, removeEntry, setLoading, setError } =
    useVaultStore()

  const loadVault = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const loaded = await repository.getAll()
      setEntries(loaded)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vault')
    } finally {
      setLoading(false)
    }
  }, [repository, setEntries, setLoading, setError])

  const addVaultEntry = useCallback(
    async (name: string, type: VaultEntryType, content: string) => {
      setError(null)
      try {
        const entry = await repository.add(name, type, content)
        addEntry(entry)
        return entry
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add vault entry')
        throw err
      }
    },
    [repository, addEntry, setError],
  )

  const renameVaultEntry = useCallback(
    async (id: string, name: string) => {
      setError(null)
      try {
        await repository.rename(id, name)
        const entry = entries.find((e) => e.id === id)
        if (entry) updateEntry({ ...entry, name })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to rename vault entry')
      }
    },
    [repository, entries, updateEntry, setError],
  )

  const deleteVaultEntry = useCallback(
    async (id: string) => {
      setError(null)
      try {
        await repository.delete(id)
        removeEntry(id)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete vault entry')
      }
    },
    [repository, removeEntry, setError],
  )

  return {
    entries,
    isLoading,
    error,
    loadVault,
    addVaultEntry,
    renameVaultEntry,
    deleteVaultEntry,
  }
}
