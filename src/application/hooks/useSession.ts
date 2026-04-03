import { useCallback } from 'react'
import { useSessionStore } from '@/application/stores'
import type { Host } from '@/domain/entities'
import { ConnectHost, DisconnectHost } from '@/domain/usecases'
import type { ISessionRepository } from '@/domain/repositories'

export function useSession(repository: ISessionRepository) {
  const { sessions, activeSessionId, addSession, removeSession, setActiveSession, updateSession } = useSessionStore()

  const connectHost = useCallback(
    async (host: Host) => {
      const useCase = new ConnectHost(repository)
      const session = await useCase.execute(host)
      addSession(session)
      setActiveSession(session.id)
      return session
    },
    [repository, addSession, setActiveSession],
  )

  const disconnectSession = useCallback(
    async (sessionId: string) => {
      const useCase = new DisconnectHost(repository)
      await useCase.execute(sessionId)
      removeSession(sessionId)
    },
    [repository, removeSession],
  )

  const executeCommand = useCallback(
    async (sessionId: string, command: string) => {
      return await repository.executeCommand(sessionId, command)
    },
    [repository],
  )

  const activeSession = activeSessionId ? sessions.get(activeSessionId) ?? null : null
  const sessionList = Array.from(sessions.values())

  return {
    sessions: sessionList,
    activeSession,
    activeSessionId,
    connectHost,
    disconnectSession,
    executeCommand,
    setActiveSession,
    updateSession,
  }
}
