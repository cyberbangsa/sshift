import { create } from 'zustand'
import type { TerminalPaneHandle } from '@/presentation/components/terminal'

interface TerminalStoreState {
  /** The handle of the currently active terminal pane. Written by ActiveSession, read by AppLayout. */
  activeTerminalHandle: TerminalPaneHandle | null
}

interface TerminalStoreActions {
  setActiveTerminalHandle: (handle: TerminalPaneHandle | null) => void
}

export type TerminalStore = TerminalStoreState & TerminalStoreActions

export const useTerminalStore = create<TerminalStore>((set) => ({
  activeTerminalHandle: null,
  setActiveTerminalHandle: (handle) => set({ activeTerminalHandle: handle }),
}))
