import { create } from 'zustand'
import { listen } from '@tauri-apps/api/event'

// ── Transfer entity (richer than the old domain Transfer) ────────────────────

export interface TransferItem {
  id: string
  sessionId: string
  filename: string
  sourcePath: string
  destPath: string
  direction: 'upload' | 'download'
  status: 'active' | 'complete' | 'failed'
  progress: number // 0-100
  bytesTransferred: number
  totalBytes: number
  error?: string
}

// Tauri emits this shape on `transfer-progress:{id}`
interface TransferProgressPayload {
  transferId: string
  bytesTransferred: number
  totalBytes: number
  percent: number
  status: 'active' | 'complete' | 'failed'
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface TransferState {
  transfers: Map<string, TransferItem>
}

interface TransferActions {
  addTransfer: (item: TransferItem) => void
  updateTransfer: (id: string, updates: Partial<TransferItem>) => void
  removeTransfer: (id: string) => void
  clearFinished: () => void
  /** Subscribe to Tauri transfer-progress events for a given transferId.
   *  Returns an unlisten callback — call it to stop listening. */
  watchTransfer: (id: string) => Promise<() => void>
}

export const useTransferStore = create<TransferState & TransferActions>((set) => ({
  transfers: new Map(),

  addTransfer: (item) =>
    set((s) => {
      const next = new Map(s.transfers)
      next.set(item.id, item)
      return { transfers: next }
    }),

  updateTransfer: (id, updates) =>
    set((s) => {
      const entry = s.transfers.get(id)
      if (!entry) return s
      const next = new Map(s.transfers)
      next.set(id, { ...entry, ...updates })
      return { transfers: next }
    }),

  removeTransfer: (id) =>
    set((s) => {
      const next = new Map(s.transfers)
      next.delete(id)
      return { transfers: next }
    }),

  clearFinished: () =>
    set((s) => {
      const next = new Map(s.transfers)
      for (const [id, t] of next) {
        if (t.status === 'complete' || t.status === 'failed') next.delete(id)
      }
      return { transfers: next }
    }),

  watchTransfer: async (id: string) => {
    const unlisten = await listen<TransferProgressPayload>(
      `transfer-progress:${id}`,
      (event) => {
        const { bytesTransferred, totalBytes, percent, status } = event.payload
        set((s) => {
          const entry = s.transfers.get(id)
          if (!entry) return s
          const next = new Map(s.transfers)
          next.set(id, {
            ...entry,
            bytesTransferred,
            totalBytes,
            progress: percent,
            status,
          })
          return { transfers: next }
        })
      },
    )
    return unlisten
  },
}))

