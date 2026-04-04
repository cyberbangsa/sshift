import { create } from 'zustand'

/**
 * Minimal interface mirroring TerminalPaneHandle from the presentation layer.
 * Defined here to avoid a circular dependency (application → presentation).
 */
export interface TerminalHandle {
  write: (data: string | Uint8Array) => void
  clear: () => void
  focus: () => void
}

interface TerminalStoreState {
  /** The handle of the currently active terminal pane. Written by ActiveSession, read by AppLayout. */
  activeTerminalHandle: TerminalHandle | null
}

interface TerminalStoreActions {
  setActiveTerminalHandle: (handle: TerminalHandle | null) => void
}

export type TerminalStore = TerminalStoreState & TerminalStoreActions

export const useTerminalStore = create<TerminalStore>((set) => ({
  activeTerminalHandle: null,
  setActiveTerminalHandle: (handle) => set({ activeTerminalHandle: handle }),
}))

