import { useCallback, useMemo } from 'react'
import { useAIStore, useSettingsStore } from '@/application/stores'
import type { AIMessage } from '@/domain/entities'
import { SendAIMessage } from '@/domain/usecases'
import { OpenRouterClient } from '@/infrastructure/api'

const RUN_TAG_RE = /<run>([\s\S]*?)<\/run>/g
const FENCE_RE = /```(\w*)\n?([\s\S]*?)```/g
const SHELL_LANGS = new Set(['bash', 'sh', 'shell', 'zsh', 'fish', 'console', ''])

/** Extracts the first <run>...</run> command and returns cleaned content + command. */
function extractRunCommand(content: string): { content: string; command: string | undefined } {
  const match = RUN_TAG_RE.exec(content)
  RUN_TAG_RE.lastIndex = 0 // reset stateful regex
  if (!match) return { content, command: undefined }
  const command = match[1].trim()
  const cleaned = content.replace(/<run>[\s\S]*?<\/run>/g, '').trim()
  return { content: cleaned, command }
}

/** Extracts all fenced shell code blocks from an AI response. */
function extractShellBlocks(content: string): string[] {
  const blocks: string[] = []
  FENCE_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = FENCE_RE.exec(content)) !== null) {
    const lang = (match[1] ?? '').toLowerCase()
    if (SHELL_LANGS.has(lang)) {
      const code = match[2].trim()
      if (code) blocks.push(code)
    }
  }
  return blocks
}

export function useAIAgent(onRunCommand?: (cmd: string) => void) {
  const { messages, isStreaming, error, addMessage, setStreaming, setError, clearMessages, executionMode, setExecutionMode } = useAIStore()
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
        const rawResponse = await useCase.execute(messages, content)

        // Extract any <run>...</run> command from the response
        const { content: cleanedContent, command } = extractRunCommand(rawResponse.content)

        const finalMessage: AIMessage = {
          ...rawResponse,
          content: cleanedContent,
          commandExecuted: command,
        }

        addMessage(finalMessage)

        // Auto mode: execute the command from <run> tag, or fall back to all
        // fenced shell code blocks in the response (LLMs often skip the tag).
        if (executionMode === 'auto' && onRunCommand) {
          if (command) {
            onRunCommand(command)
          } else {
            const shellBlocks = extractShellBlocks(rawResponse.content)
            for (const block of shellBlocks) {
              onRunCommand(block)
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'AI request failed')
      } finally {
        setStreaming(false)
      }
    },
    [aiClient, messages, addMessage, setStreaming, setError, executionMode, onRunCommand],
  )

  return {
    messages,
    isStreaming,
    error,
    sendMessage,
    clearMessages,
    hasApiKey: openRouterApiKey !== null,
    executionMode,
    setExecutionMode,
  }
}

