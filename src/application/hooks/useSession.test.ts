import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSession } from './useSession'
import { MockSessionRepository } from '@/test/mocks'
import { createHost } from '@/test/factories'
import { useSessionStore } from '@/application/stores'

describe('useSession', () => {
  let repository: MockSessionRepository

  beforeEach(() => {
    repository = new MockSessionRepository()
    useSessionStore.setState({
      sessions: new Map(),
      activeSessionId: null,
    })
  })

  it('should connect to a host and create a session', async () => {
    const { result } = renderHook(() => useSession(repository))
    const host = createHost({ id: 'host-1' })

    let session: unknown
    await act(async () => {
      session = await result.current.connectHost(host)
    })

    expect(result.current.sessions).toHaveLength(1)
    expect(result.current.activeSession).toBeDefined()
    expect(result.current.activeSession?.status).toBe('connected')
  })

  it('should disconnect a session', async () => {
    const { result } = renderHook(() => useSession(repository))
    const host = createHost()

    let sessionId: string
    await act(async () => {
      const session = await result.current.connectHost(host)
      sessionId = session.id
    })

    await act(async () => {
      await result.current.disconnectSession(sessionId!)
    })

    expect(result.current.sessions).toHaveLength(0)
    expect(result.current.activeSession).toBeNull()
  })

  it('should execute a command on a session', async () => {
    const { result } = renderHook(() => useSession(repository))

    let output: string
    await act(async () => {
      output = await result.current.executeCommand('session-1', 'ls')
    })

    expect(output!).toBe('mock command output')
  })

  it('should throw when connecting to unreachable host', async () => {
    repository = new MockSessionRepository({ shouldFail: true })
    const { result } = renderHook(() => useSession(repository))
    const host = createHost()

    await expect(
      act(async () => {
        await result.current.connectHost(host)
      }),
    ).rejects.toThrow()
  })
})
