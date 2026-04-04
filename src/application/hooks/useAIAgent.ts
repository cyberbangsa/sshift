import { useCallback, useMemo, useRef } from 'react'
import { useAIStore, useSettingsStore } from '@/application/stores'
import type { AIMessage } from '@/domain/entities'
import { SendAIMessage } from '@/domain/usecases'
import { OpenRouterClient } from '@/infrastructure/api'

const RUN_TAG_RE = /<run>([\s\S]*?)<\/run>/g
const READFILE_TAG_RE = /<readfile>([\s\S]*?)<\/readfile>/g
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

/** Extracts all <readfile>...</readfile> paths from a response. */
function extractReadFilePaths(content: string): string[] {
  const paths: string[] = []
  READFILE_TAG_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = READFILE_TAG_RE.exec(content)) !== null) {
    const p = match[1].trim()
    if (p) paths.push(p)
  }
  return paths
}

/**
 * onRunCommand: runs a shell command and returns its terminal output.
 * onReadFile: reads a remote file via SFTP and returns its content.
 * Passing these lets the agent see results and continue autonomously.
 */
export function useAIAgent(
  onRunCommand?: (cmd: string) => Promise<string>,
  onReadFile?: (path: string) => Promise<string>,
) {
  const { messages, isStreaming, error, addMessage, setStreaming, setError, clearMessages, executionMode, setExecutionMode } = useAIStore()
  const { settings, openRouterApiKey } = useSettingsStore()
  const abortRef = useRef<AbortController | null>(null)

  const abort = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

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

      // Cancel any in-flight request and start a fresh one
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const signal = controller.signal

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
        const rawResponse = await useCase.execute(messages, content, signal)
        if (signal.aborted) return
        const { content: cleanedContent, command } = extractRunCommand(rawResponse.content)
        // Strip <readfile> tags from displayed content
        const displayContent = cleanedContent.replace(/<readfile>[\s\S]*?<\/readfile>/g, '').trim()
        const firstMsg: AIMessage = { ...rawResponse, content: displayContent, commandExecuted: command }
        addMessage(firstMsg)

        // ── Auto-mode agentic loop ────────────────────────────────────────
        if (executionMode === 'auto' && (onRunCommand || onReadFile)) {
          let localMessages: AIMessage[] = [...messages, userMessage, firstMsg]
          let rawContent = rawResponse.content
          let iteration = 0

          while (iteration < MAX_AGENT_ITERATIONS) {
            if (signal.aborted) break
            iteration++
            const feedbackParts: string[] = []

            // Handle <readfile> tags first
            const filePaths = extractReadFilePaths(rawContent)
            if (filePaths.length > 0 && onReadFile) {
              for (const filePath of filePaths) {
                if (signal.aborted) break
                try {
                  const fileContent = await onReadFile(filePath)
                  const preview = fileContent.length > 40000
                    ? fileContent.slice(0, 40000) + '\n...[truncated]'
                    : fileContent
                  feedbackParts.push(`File contents of ${filePath}:\n\`\`\`\n${preview}\n\`\`\``)
                } catch (e) {
                  feedbackParts.push(`Could not read ${filePath}: ${e}`)
                }
              }
            }

            if (signal.aborted) break

            // Handle shell commands
            const { command: runCmd } = extractRunCommand(rawContent)
            const shellBlocks = runCmd ? [runCmd] : extractShellBlocks(rawContent)
            if (shellBlocks.length > 0 && onRunCommand) {
              for (const cmd of shellBlocks) {
                if (signal.aborted) break
                const out = await onRunCommand(cmd)
                if (out) feedbackParts.push(`$ ${cmd}\n${out}`)
              }
            }

            if (signal.aborted || feedbackParts.length === 0) break

            const feedbackContent =
              feedbackParts.join('\n\n') + '\n\n' +
              'Analyse the above. If the task is complete, summarise the result. ' +
              'If further commands or file reads are needed, issue them now.'

            const feedbackMsg: AIMessage = {
              id: crypto.randomUUID(),
              role: 'user',
              content: feedbackContent,
              timestamp: new Date(),
            }
            addMessage(feedbackMsg)
            localMessages = [...localMessages, feedbackMsg]

            setStreaming(true)
            const nextRaw = await useCase.execute(localMessages, feedbackContent, signal)
            if (signal.aborted) break
            const { content: nextCleaned, command: nextCmd } = extractRunCommand(nextRaw.content)
            const nextDisplay = nextCleaned.replace(/<readfile>[\s\S]*?<\/readfile>/g, '').trim()
            const nextMsg: AIMessage = { ...nextRaw, content: nextDisplay, commandExecuted: nextCmd }
            addMessage(nextMsg)
            localMessages = [...localMessages, nextMsg]
            rawContent = nextRaw.content

            // Stop if no more actions are requested
            const moreFiles = extractReadFilePaths(rawContent)
            const moreCommands = nextCmd ? [nextCmd] : extractShellBlocks(rawContent)
            if (moreFiles.length === 0 && moreCommands.length === 0) break
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return // user cancelled
        setError(err instanceof Error ? err.message : 'AI request failed')
      } finally {
        if (!signal.aborted) abortRef.current = null
        setStreaming(false)
      }
    },
    [aiClient, messages, addMessage, setStreaming, setError, executionMode, onRunCommand, onReadFile],
  )

  return {
    messages,
    isStreaming,
    error,
    sendMessage,
    abort,
    clearMessages,
    hasApiKey: openRouterApiKey !== null,
    executionMode,
    setExecutionMode,
  }
}

