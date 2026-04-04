import type { AIMessage } from '@/domain/entities'
import type { IAIClient } from '@/domain/usecases/SendAIMessage'

export interface OpenRouterConfig {
  apiKey: string
  model: string
  maxTokens: number
  systemPrompt: string
}

interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface OpenRouterChoice {
  message: { content: string }
}

interface OpenRouterResponse {
  choices: OpenRouterChoice[]
}

export class OpenRouterClient implements IAIClient {
  private readonly config: OpenRouterConfig

  constructor(config: OpenRouterConfig) {
    this.config = config
  }

  async sendMessage(history: AIMessage[], userMessage: string): Promise<string> {
    const messages: OpenRouterMessage[] = [
      { role: 'system', content: this.config.systemPrompt },
      ...history.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: userMessage },
    ]

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
        'HTTP-Referer': 'https://sshift.app',
        'X-Title': 'SSHift',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        messages,
      }),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText)
      throw new Error(`OpenRouter API error ${response.status}: ${text}`)
    }

    const data = (await response.json()) as OpenRouterResponse
    return data.choices[0]?.message.content ?? ''
  }
}
