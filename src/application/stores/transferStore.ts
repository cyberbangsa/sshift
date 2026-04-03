import { create } from 'zustand'
import type { Transfer } from '@/domain/entities'

interface TransferState {
  transfers: Transfer[]
}

interface TransferActions {
  addTransfer: (transfer: Transfer) => void
  updateTransfer: (id: string, updates: Partial<Transfer>) => void
  removeTransfer: (id: string) => void
  clearCompleted: () => void
  getActiveTransfers: () => Transfer[]
}

export type TransferStore = TransferState & TransferActions

export const useTransferStore = create<TransferStore>((set, get) => ({
  transfers: [],
  addTransfer: (transfer) =>
    set((state) => ({ transfers: [...state.transfers, transfer] })),
  updateTransfer: (id, updates) =>
    set((state) => ({
      transfers: state.transfers.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
  removeTransfer: (id) =>
    set((state) => ({
      transfers: state.transfers.filter((t) => t.id !== id),
    })),
  clearCompleted: () =>
    set((state) => ({
      transfers: state.transfers.filter((t) => t.status !== 'complete'),
    })),
  getActiveTransfers: () => get().transfers.filter((t) => t.status === 'active'),
}))
