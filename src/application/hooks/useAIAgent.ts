import { useCallback } from 'react'
import { useAIStore } from '@/application/stores'
import type { AIMessage } from '@/domain/entities'
import { SendAIMessage } from '@/domain/usecases'
import type { IAIClient } from '@/domain/usecases/SendAIMessage'

export function useAIAgent(aiClient: IAIClient) {
  const { messages, isStreaming, error, addMessage, setStreaming, setError, clearMessages } = useAIStore()

  const sendMessage = useCallback(
    async (content: string) => {
      const userMessage: AIMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: new Date(),
      }
      addMessage(userMessage)
      setStreaming(true)
      setError(null)

      try {
        const useCase = new SendAIMessage(aiClient)
        const response = await useCase.execute(messages, content)
        addMessage(response)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'AI request failed')
      } finally {
        setStreaming(false)
      }
    },
    [aiClient, messages, addMessage, setStreaming, setError],
  )

  return {
    messages,
    isStreaming,
    error,
    sendMessage,
    clearMessages,
  }
}
