import { useCallback } from 'react'
import { useHostStore } from '@/application/stores'
import type { Host } from '@/domain/entities'
import type { IHostRepository } from '@/domain/repositories'

export function useHost(repository: IHostRepository) {
  const { hosts, selectedHostId, isLoading, error, setHosts, addHost, updateHost, removeHost, selectHost, setLoading, setError } = useHostStore()

  const loadHosts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const loaded = await repository.getAll()
      setHosts(loaded)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hosts')
    } finally {
      setLoading(false)
    }
  }, [repository, setHosts, setLoading, setError])

  const saveHost = useCallback(
    async (host: Host) => {
      setError(null)
      try {
        await repository.save(host)
        const exists = hosts.find((h) => h.id === host.id)
        if (exists) {
          updateHost(host)
        } else {
          addHost(host)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save host')
      }
    },
    [repository, hosts, addHost, updateHost, setError],
  )

  const deleteHost = useCallback(
    async (id: string) => {
      setError(null)
      try {
        await repository.delete(id)
        removeHost(id)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete host')
      }
    },
    [repository, removeHost, setError],
  )

  const selectedHost = hosts.find((h) => h.id === selectedHostId) ?? null

  return {
    hosts,
    selectedHost,
    selectedHostId,
    isLoading,
    error,
    loadHosts,
    saveHost,
    deleteHost,
    selectHost,
  }
}
