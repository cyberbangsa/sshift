import { create } from 'zustand'

/**
 * Minimal interface mirroring TerminalPaneHandle from the presentation layer.
 * Defined here to avoid a circular dependency (application → presentation).
 */
export interface TerminalHandle {
  write: (data: string | Uint8Array) => void
  clear: () => void
  focus: () => void
  sendInput: (data: string) => void
  captureOutput: (timeoutMs?: number) => Promise<string>
}

interface TerminalStoreState {
  /**
   * One handle per session. All ActiveSession panes stay mounted (to preserve
   * terminal scrollback), so we key by sessionId instead of keeping a single
   * "active" reference — otherwise the last-mounted session would always win.
   */
  handles: Map<string, TerminalHandle>
}

interface TerminalStoreActions {
  /** Called by ActiveSession when its TerminalPane ref is set. */
  registerHandle: (sessionId: string, handle: TerminalHandle) => void
  /** Called by ActiveSession cleanup when the component unmounts. */
  unregisterHandle: (sessionId: string) => void
  /** Returns the handle for a specific session (undefined if not yet mounted). */
  getHandle: (sessionId: string) => TerminalHandle | undefined
}

export type TerminalStore = TerminalStoreState & TerminalStoreActions

export const useTerminalStore = create<TerminalStore>((set, get) => ({
  handles: new Map(),

  registerHandle: (sessionId, handle) =>
    set((state) => {
      const handles = new Map(state.handles)
      handles.set(sessionId, handle)
      return { handles }
    }),

  unregisterHandle: (sessionId) =>
    set((state) => {
      const handles = new Map(state.handles)
      handles.delete(sessionId)
      return { handles }
    }),

  getHandle: (sessionId) => get().handles.get(sessionId),
}))

