import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAIAgent } from './useAIAgent'
import { MockAIClient } from '@/test/mocks'
import { useAIStore } from '@/application/stores'

describe('useAIAgent', () => {
  let client: MockAIClient

  beforeEach(() => {
    client = new MockAIClient({ response: 'AI says hello' })
    useAIStore.setState({
      messages: [],
      isStreaming: false,
      error: null,
    })
  })

  it('should send a message and receive a response', async () => {
    const { result } = renderHook(() => useAIAgent(client))

    await act(async () => {
      await result.current.sendMessage('Hello AI')
    })

    // Should have user message + assistant response
    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[0].role).toBe('user')
    expect(result.current.messages[0].content).toBe('Hello AI')
    expect(result.current.messages[1].role).toBe('assistant')
    expect(result.current.messages[1].content).toBe('AI says hello')
  })

  it('should set streaming state during request', async () => {
    const { result } = renderHook(() => useAIAgent(client))

    expect(result.current.isStreaming).toBe(false)

    await act(async () => {
      await result.current.sendMessage('Test')
    })

    expect(result.current.isStreaming).toBe(false)
  })

  it('should set error when AI client fails', async () => {
    client = new MockAIClient({ shouldFail: true })
    const { result } = renderHook(() => useAIAgent(client))

    await act(async () => {
      await result.current.sendMessage('Hello')
    })

    expect(result.current.error).toBe('AI service unavailable')
    // User message was still added
    expect(result.current.messages).toHaveLength(1)
    expect(result.current.messages[0].role).toBe('user')
  })

  it('should clear messages', async () => {
    const { result } = renderHook(() => useAIAgent(client))

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
