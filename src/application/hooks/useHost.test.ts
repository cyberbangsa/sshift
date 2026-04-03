import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useHost } from './useHost'
import { MockHostRepository } from '@/test/mocks'
import { createHost } from '@/test/factories'
import { useHostStore } from '@/application/stores'

describe('useHost', () => {
  let repository: MockHostRepository

  beforeEach(() => {
    repository = new MockHostRepository()
    // Reset zustand store between tests
    useHostStore.setState({
      hosts: [],
      selectedHostId: null,
      isLoading: false,
      error: null,
    })
  })

  it('should load hosts from repository', async () => {
    const hosts = [createHost({ id: '1', label: 'Server A' }), createHost({ id: '2', label: 'Server B' })]
    repository = new MockHostRepository(hosts)

    const { result } = renderHook(() => useHost(repository))

    await act(async () => {
      await result.current.loadHosts()
    })

    expect(result.current.hosts).toHaveLength(2)
    expect(result.current.hosts[0].label).toBe('Server A')
  })

  it('should save a new host', async () => {
    const { result } = renderHook(() => useHost(repository))
    const host = createHost({ id: 'new-host', label: 'New Server' })

    await act(async () => {
      await result.current.saveHost(host)
    })

    expect(result.current.hosts).toHaveLength(1)
    expect(result.current.hosts[0].label).toBe('New Server')
  })

  it('should delete a host', async () => {
    const hosts = [createHost({ id: 'del-1' })]
    repository = new MockHostRepository(hosts)

    const { result } = renderHook(() => useHost(repository))

    await act(async () => {
      await result.current.loadHosts()
    })
    expect(result.current.hosts).toHaveLength(1)

    await act(async () => {
      await result.current.deleteHost('del-1')
    })
    expect(result.current.hosts).toHaveLength(0)
  })

  it('should select a host', async () => {
    const { result } = renderHook(() => useHost(repository))

    act(() => {
      result.current.selectHost('some-id')
    })

    expect(result.current.selectedHostId).toBe('some-id')
  })

  it('should track loading state', async () => {
    const { result } = renderHook(() => useHost(repository))

    expect(result.current.isLoading).toBe(false)
  })
})
