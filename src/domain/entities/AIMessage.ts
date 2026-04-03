export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  commandExecuted?: string
  commandOutput?: string
}
