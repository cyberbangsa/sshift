import { create } from 'zustand'
import type { VaultEntry } from '@/domain/entities'

interface VaultState {
  entries: VaultEntry[]
  isLoading: boolean
  error: string | null
}

interface VaultActions {
  setEntries: (entries: VaultEntry[]) => void
  addEntry: (entry: VaultEntry) => void
  updateEntry: (entry: VaultEntry) => void
  removeEntry: (id: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export type VaultStore = VaultState & VaultActions

export const useVaultStore = create<VaultStore>((set) => ({
  entries: [],
  isLoading: false,
  error: null,
  setEntries: (entries) => set({ entries }),
  addEntry: (entry) => set((state) => ({ entries: [...state.entries, entry] })),
  updateEntry: (entry) =>
    set((state) => ({
      entries: state.entries.map((e) => (e.id === entry.id ? entry : e)),
    })),
  removeEntry: (id) => set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}))
