import { useCallback, useMemo } from 'react'
import { useAIStore, useSettingsStore } from '@/application/stores'
import type { AIMessage } from '@/domain/entities'
import { SendAIMessage } from '@/domain/usecases'
import { OpenRouterClient } from '@/infrastructure/api'

const RUN_TAG_RE = /<run>([\s\S]*?)<\/run>/g
const FENCE_RE = /```(\w*)\n?([\s\S]*?)```/g
const SHELL_LANGS = new Set(['bash', 'sh', 'shell', 'zsh', 'fish', 'console', ''])
const MAX_AGENT_ITERATIONS = 5

/** Extracts the first <run>...</run> command and returns cleaned content + command. */
function extractRunCommand(content: string): { content: string; command: string | undefined } {
  const match = RUN_TAG_RE.exec(content)
  RUN_TAG_RE.lastIndex = 0
  if (!match) return { content, command: undefined }
  const command = match[1].trim()
  const cleaned = content.replace(/<run>[\s\S]*?<\/run>/g, '').trim()
  return { content: cleaned, command }
}

/** Extracts all fenced shell code blocks from a response string. */
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

/**
 * onRunCommand: runs a shell command and returns its terminal output.
 * Passing this lets the agent see results and continue autonomously.
 */
export function useAIAgent(onRunCommand?: (cmd: string) => Promise<string>) {
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

        // ── First AI response ────────────────────────────────────────────
        const rawResponse = await useCase.execute(messages, content)
        const { content: cleanedContent, command } = extractRunCommand(rawResponse.content)
        const firstMsg: AIMessage = { ...rawResponse, content: cleanedContent, commandExecuted: command }
        addMessage(firstMsg)

        // ── Auto-mode agentic loop ────────────────────────────────────────
        if (executionMode === 'auto' && onRunCommand) {
          let localMessages: AIMessage[] = [...messages, userMessage, firstMsg]
          let nextCommands = command ? [command] : extractShellBlocks(rawResponse.content)
          let iteration = 0

          while (nextCommands.length > 0 && iteration < MAX_AGENT_ITERATIONS) {
            iteration++

            // Run each command and collect its output
            const outputParts: string[] = []
            for (const cmd of nextCommands) {
              const out = await onRunCommand(cmd)
              if (out) outputParts.push(`$ ${cmd}\n${out}`)
            }

            if (outputParts.length === 0) break

            // Feed output back to the AI
            const outputText = outputParts.join('\n\n')
            const feedbackContent =
              `Command output:\n\`\`\`\n${outputText}\n\`\`\`\n\n` +
              `Analyse the output. If the task is complete, summarise the result. ` +
              `If you need to run further commands to complete the task, include them ` +
              `(wrapped in <run>...</run> or as a fenced shell block).`

            const feedbackMsg: AIMessage = {
              id: crypto.randomUUID(),
              role: 'user',
              content: feedbackContent,
              timestamp: new Date(),
            }
            addMessage(feedbackMsg)
            localMessages = [...localMessages, feedbackMsg]

            setStreaming(true)
            const nextRaw = await useCase.execute(localMessages, feedbackContent)
            const { content: nextCleaned, command: nextCmd } = extractRunCommand(nextRaw.content)
            const nextMsg: AIMessage = { ...nextRaw, content: nextCleaned, commandExecuted: nextCmd }
            addMessage(nextMsg)
            localMessages = [...localMessages, nextMsg]

            // Decide whether to continue the loop
            nextCommands = nextCmd ? [nextCmd] : extractShellBlocks(nextRaw.content)
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

