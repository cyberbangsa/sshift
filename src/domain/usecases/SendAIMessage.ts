import type { AIMessage } from '@/domain/entities'

export interface IAIClient {
  sendMessage(messages: AIMessage[], userMessage: string, signal?: AbortSignal): Promise<string>
}

export class AIMessageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AIMessageError'
  }
}

/** Sends a user message to the AI assistant and returns the response. */
export class SendAIMessage {
  private readonly aiClient: IAIClient
  constructor(aiClient: IAIClient) {
    this.aiClient = aiClient
  }

  async execute(
    history: AIMessage[],
    userMessage: string,
    signal?: AbortSignal,
  ): Promise<AIMessage> {
    if (!userMessage.trim()) {
      throw new AIMessageError('Message cannot be empty')
    }

    try {
      const responseContent = await this.aiClient.sendMessage(history, userMessage, signal)

      const assistantMessage: AIMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
      }

      return assistantMessage
    } catch (error) {
      throw new AIMessageError(error instanceof Error ? error.message : 'Failed to get AI response')
    }
  }
}
