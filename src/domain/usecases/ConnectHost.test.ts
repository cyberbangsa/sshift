import { describe, it, expect, beforeEach } from 'vitest'
import { ConnectHost, ConnectionError } from './ConnectHost'
import { MockSessionRepository } from '@/test/mocks'
import { createHost } from '@/test/factories'

describe('ConnectHost', () => {
  let repository: MockSessionRepository
  let useCase: ConnectHost

  beforeEach(() => {
    repository = new MockSessionRepository()
    useCase = new ConnectHost(repository)
  })

  it('should return a connected session when host is valid', async () => {
    const host = createHost({ hostname: '192.168.1.1', username: 'admin' })

    const session = await useCase.execute(host)

    expect(session.status).toBe('connected')
    expect(session.hostId).toBe(host.id)
    expect(session.connectedAt).toBeInstanceOf(Date)
  })

  it('should throw ConnectionError when host is unreachable', async () => {
    repository = new MockSessionRepository({ shouldFail: true })
    useCase = new ConnectHost(repository)
    const host = createHost()

    await expect(useCase.execute(host)).rejects.toThrow(ConnectionError)
  })

  it('should throw ConnectionError when hostname is empty', async () => {
    const host = createHost({ hostname: '' })

    await expect(useCase.execute(host)).rejects.toThrow(ConnectionError)
    await expect(useCase.execute(host)).rejects.toThrow('Host must have a hostname and username')
  })

  it('should throw ConnectionError when username is empty', async () => {
    const host = createHost({ username: '' })

    await expect(useCase.execute(host)).rejects.toThrow(ConnectionError)
  })

  it('should throw ConnectionError for invalid port', async () => {
    const hostLow = createHost({ port: 0 })
    await expect(useCase.execute(hostLow)).rejects.toThrow('Invalid port: 0')

    const hostHigh = createHost({ port: 70000 })
    await expect(useCase.execute(hostHigh)).rejects.toThrow('Invalid port: 70000')
  })

  it('should preserve the error message from repository failure', async () => {
    repository = new MockSessionRepository({
      shouldFail: true,
      failMessage: 'Network timeout',
    })
    useCase = new ConnectHost(repository)
    const host = createHost()

    await expect(useCase.execute(host)).rejects.toThrow('Network timeout')
  })

  it('should include hostId in ConnectionError', async () => {
    repository = new MockSessionRepository({ shouldFail: true })
    useCase = new ConnectHost(repository)
    const host = createHost({ id: 'host-123' })

    try {
      await useCase.execute(host)
      expect.fail('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(ConnectionError)
      expect((error as ConnectionError).hostId).toBe('host-123')
    }
  })
})
