import { create } from 'zustand'
import type { Host } from '@/domain/entities'

interface HostState {
  hosts: Host[]
  selectedHostId: string | null
  isLoading: boolean
  error: string | null
}

interface HostActions {
  setHosts: (hosts: Host[]) => void
  addHost: (host: Host) => void
  updateHost: (host: Host) => void
  removeHost: (id: string) => void
  selectHost: (id: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export type HostStore = HostState & HostActions

export const useHostStore = create<HostStore>((set) => ({
  hosts: [],
  selectedHostId: null,
  isLoading: false,
  error: null,
  setHosts: (hosts) => set({ hosts }),
  addHost: (host) => set((state) => ({ hosts: [...state.hosts, host] })),
  updateHost: (host) =>
    set((state) => ({
      hosts: state.hosts.map((h) => (h.id === host.id ? host : h)),
    })),
  removeHost: (id) =>
    set((state) => ({
      hosts: state.hosts.filter((h) => h.id !== id),
      selectedHostId: state.selectedHostId === id ? null : state.selectedHostId,
    })),
  selectHost: (id) => set({ selectedHostId: id }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}))
