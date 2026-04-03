import { create } from 'zustand'
import type { Session } from '@/domain/entities'

interface SessionState {
  sessions: Map<string, Session>
  activeSessionId: string | null
}

interface SessionActions {
  addSession: (session: Session) => void
  updateSession: (sessionId: string, updates: Partial<Session>) => void
  removeSession: (sessionId: string) => void
  setActiveSession: (sessionId: string | null) => void
  getSession: (sessionId: string) => Session | undefined
}

export type SessionStore = SessionState & SessionActions

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessions: new Map(),
  activeSessionId: null,
  addSession: (session) =>
    set((state) => {
      const sessions = new Map(state.sessions)
      sessions.set(session.id, session)
      return { sessions, activeSessionId: session.id }
    }),
  updateSession: (sessionId, updates) =>
    set((state) => {
      const sessions = new Map(state.sessions)
      const existing = sessions.get(sessionId)
      if (existing) {
        sessions.set(sessionId, { ...existing, ...updates })
      }
      return { sessions }
    }),
  removeSession: (sessionId) =>
    set((state) => {
      const sessions = new Map(state.sessions)
      sessions.delete(sessionId)
      return {
        sessions,
        activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId,
      }
    }),
  setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),
  getSession: (sessionId) => get().sessions.get(sessionId),
}))
