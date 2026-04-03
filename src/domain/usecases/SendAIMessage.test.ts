import { describe, it, expect, beforeEach } from 'vitest'
import { SendAIMessage, AIMessageError } from './SendAIMessage'
import { MockAIClient } from '@/test/mocks'
import { createAIMessage } from '@/test/factories'

describe('SendAIMessage', () => {
  let client: MockAIClient
  let useCase: SendAIMessage

  beforeEach(() => {
    client = new MockAIClient({ response: 'Hello from AI!' })
    useCase = new SendAIMessage(client)
  })

  it('should return an assistant message with the AI response', async () => {
    const history = [createAIMessage({ role: 'user', content: 'Hi' })]

    const result = await useCase.execute(history, 'What is SSH?')

    expect(result.role).toBe('assistant')
    expect(result.content).toBe('Hello from AI!')
    expect(result.id).toBeDefined()
    expect(result.timestamp).toBeInstanceOf(Date)
  })

  it('should throw AIMessageError when message is empty', async () => {
    await expect(useCase.execute([], '')).rejects.toThrow(AIMessageError)
    await expect(useCase.execute([], '   ')).rejects.toThrow('Message cannot be empty')
  })

  it('should throw AIMessageError when AI client fails', async () => {
    client = new MockAIClient({ shouldFail: true })
    useCase = new SendAIMessage(client)

    await expect(useCase.execute([], 'Hello')).rejects.toThrow(AIMessageError)
    await expect(useCase.execute([], 'Hello')).rejects.toThrow('AI service unavailable')
  })

  it('should pass conversation history to the client', async () => {
    const history = [
      createAIMessage({ role: 'user', content: 'First' }),
      createAIMessage({ role: 'assistant', content: 'Response' }),
    ]

    await useCase.execute(history, 'Second')

    expect(client.lastMessages).toHaveLength(2)
  })

  it('should work with empty history', async () => {
    const result = await useCase.execute([], 'First message')

    expect(result.role).toBe('assistant')
    expect(result.content).toBe('Hello from AI!')
  })
})
