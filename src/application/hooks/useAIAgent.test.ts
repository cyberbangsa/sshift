import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAIAgent } from './useAIAgent'
import { useAIStore, useSettingsStore } from '@/application/stores'
import { DEFAULT_SETTINGS } from '@/domain/entities'

describe('useAIAgent', () => {
  beforeEach(() => {
    useAIStore.setState({ messages: [], isStreaming: false, error: null, executionMode: 'manual' })
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS },
      openRouterApiKey: null,
      isApiKeyLoaded: true,
      isSaving: false,
      error: null,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should report error when no API key is configured', async () => {
    const { result } = renderHook(() => useAIAgent())

    await act(async () => {
      await result.current.sendMessage('Hello AI')
    })

    expect(result.current.error).toMatch(/API key/)
    expect(result.current.messages).toHaveLength(0)
    expect(result.current.hasApiKey).toBe(false)
  })

  it('should send a message and receive a response when API key is set', async () => {
    useSettingsStore.setState({ openRouterApiKey: 'sk-test-key' })

    const mockResponse = {
      choices: [{ message: { content: 'AI says hello' } }],
    }
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    )

    const { result } = renderHook(() => useAIAgent())

    await act(async () => {
      await result.current.sendMessage('Hello AI')
    })

    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[0].role).toBe('user')
    expect(result.current.messages[0].content).toBe('Hello AI')
    expect(result.current.messages[1].role).toBe('assistant')
    expect(result.current.messages[1].content).toBe('AI says hello')
  })

  it('should set error when API request fails', async () => {
    useSettingsStore.setState({ openRouterApiKey: 'sk-test-key' })

    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('Unauthorized', { status: 401 }),
    )

    const { result } = renderHook(() => useAIAgent())

    await act(async () => {
      await result.current.sendMessage('Hello')
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.messages).toHaveLength(1)
    expect(result.current.messages[0].role).toBe('user')
  })

  it('should set streaming state during request', async () => {
    useSettingsStore.setState({ openRouterApiKey: 'sk-test-key' })

    let resolveResponse!: (v: Response) => void
    const pending = new Promise<Response>((r) => { resolveResponse = r })
    vi.spyOn(global, 'fetch').mockReturnValueOnce(pending)

    const { result } = renderHook(() => useAIAgent())

    const sendPromise = act(async () => {
      // do not await yet
      result.current.sendMessage('Test')
    })

    // Resolve immediately
    resolveResponse(new Response(JSON.stringify({ choices: [{ message: { content: 'hi' } }] }), { status: 200 }))
    await sendPromise

    expect(result.current.isStreaming).toBe(false)
  })

  it('should clear messages', async () => {
    useSettingsStore.setState({ openRouterApiKey: 'sk-test-key' })

    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ choices: [{ message: { content: 'hi' } }] }), { status: 200 }),
    )

    const { result } = renderHook(() => useAIAgent())

    await act(async () => {
      await result.current.sendMessage('Hello')
    })
    expect(result.current.messages.length).toBeGreaterThan(0)

    act(() => {
      result.current.clearMessages()
    })

    expect(result.current.messages).toHaveLength(0)
  })
})

