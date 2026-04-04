import { useCallback, useMemo } from 'react'
import { useAIStore, useSettingsStore } from '@/application/stores'
import type { AIMessage } from '@/domain/entities'
import { SendAIMessage } from '@/domain/usecases'
import { OpenRouterClient } from '@/infrastructure/api'

export function useAIAgent() {
  const { messages, isStreaming, error, addMessage, setStreaming, setError, clearMessages } = useAIStore()
  const { settings, openRouterApiKey } = useSettingsStore()

  const aiClient = useMemo(() => {
    if (!openRouterApiKey) return null
    return new OpenRouterClient({
      apiKey: openRouterApiKey,
      model: settings.aiModel,
      maxTokens: settings.aiMaxTokens,
      systemPrompt: settings.aiSystemPrompt,
    })
  }, [openRouterApiKey, settings.aiModel, settings.aiMaxTokens, settings.aiSystemPrompt])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!aiClient) {
        setError('No API key configured. Please add your OpenRouter API key in Settings.')
        return
      }
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
    hasApiKey: openRouterApiKey !== null,
  }
}
