import { create } from 'zustand'
import type { AIMessage } from '@/domain/entities'

export type ExecutionMode = 'manual' | 'auto'

/** State tracked independently for each open session/tab. */
export interface PerSessionAIState {
  messages: AIMessage[]
  isStreaming: boolean
  error: string | null
  executionMode: ExecutionMode
}

export const DEFAULT_SESSION_STATE: PerSessionAIState = {
  messages: [],
  isStreaming: false,
  error: null,
  executionMode: 'manual',
}

interface AIState {
  /** Per-session AI state keyed by sessionId. */
  sessions: Map<string, PerSessionAIState>
}

interface AIActions {
  addMessage: (sessionId: string, message: AIMessage) => void
  setStreaming: (sessionId: string, streaming: boolean) => void
  setError: (sessionId: string, error: string | null) => void
  clearMessages: (sessionId: string) => void
  setExecutionMode: (sessionId: string, mode: ExecutionMode) => void
  /** Remove all AI state for a session when the connection is closed. */
  removeSession: (sessionId: string) => void
  /** Returns the AI state for a session, creating default state if absent. */
  getSessionState: (sessionId: string) => PerSessionAIState
}

export type AIStore = AIState & AIActions

function updateSession(
  state: AIState,
  sessionId: string,
  updater: (s: PerSessionAIState) => Partial<PerSessionAIState>,
): Pick<AIState, 'sessions'> {
  const sessions = new Map(state.sessions)
  const current = sessions.get(sessionId) ?? { ...DEFAULT_SESSION_STATE }
  sessions.set(sessionId, { ...current, ...updater(current) })
  return { sessions }
}

export const useAIStore = create<AIStore>((set, get) => ({
  sessions: new Map(),

  addMessage: (sessionId, message) =>
    set((state) =>
      updateSession(state, sessionId, (s) => ({ messages: [...s.messages, message] })),
    ),

  setStreaming: (sessionId, isStreaming) =>
    set((state) => updateSession(state, sessionId, () => ({ isStreaming }))),

  setError: (sessionId, error) =>
    set((state) => updateSession(state, sessionId, () => ({ error }))),

  clearMessages: (sessionId) =>
    set((state) => updateSession(state, sessionId, () => ({ messages: [], error: null }))),

  setExecutionMode: (sessionId, executionMode) =>
    set((state) => updateSession(state, sessionId, () => ({ executionMode }))),

  removeSession: (sessionId) =>
    set((state) => {
      const sessions = new Map(state.sessions)
      sessions.delete(sessionId)
      return { sessions }
    }),

  getSessionState: (sessionId) => get().sessions.get(sessionId) ?? { ...DEFAULT_SESSION_STATE },
}))
