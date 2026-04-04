import Anthropic from '@anthropic-ai/sdk'
import type { AIMessage } from '@/domain/entities'
import type { IAIClient } from '@/domain/usecases/SendAIMessage'

interface AnthropicConfig {
  apiKey: string
  model?: string
  maxTokens?: number
}

export class AnthropicClient implements IAIClient {
  private client: Anthropic
  private model: string
  private maxTokens: number

  constructor(config: AnthropicConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey, dangerouslyAllowBrowser: true })
    this.model = config.model ?? 'claude-sonnet-4-20250514'
    this.maxTokens = config.maxTokens ?? 4096
  }

  async sendMessage(history: AIMessage[], userMessage: string, signal?: AbortSignal): Promise<string> {
    const messages = [
      ...history.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user' as const, content: userMessage },
    ]

    const response = await this.client.messages.create(
      {
        model: this.model,
        max_tokens: this.maxTokens,
        system:
          'You are SSHift AI, an assistant that helps users manage SSH connections, ' +
          'navigate remote file systems, and execute commands. You can suggest commands ' +
          'and explain their effects. Be concise and security-conscious.',
        messages,
      },
      { signal },
    )

    const textBlock = response.content.find((block) => block.type === 'text')
    return textBlock ? textBlock.text : ''
  }
}
