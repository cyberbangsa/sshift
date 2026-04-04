export type AIProvider = 'openrouter'

export interface Settings {
  // AI
  aiProvider: AIProvider
  aiModel: string
  aiMaxTokens: number
  aiSystemPrompt: string
  aiHistoryLength: number

  // Terminal
  terminalFontSize: number
  terminalFontFamily: string

  // Connections
  defaultSshPort: number
  defaultRemotePath: string
}

export const DEFAULT_SETTINGS: Settings = {
  aiProvider: 'openrouter',
  aiModel: 'openai/gpt-4o',
  aiMaxTokens: 4096,
  aiSystemPrompt:
    'You are SSHift AI, an assistant that helps users manage SSH connections, ' +
    'navigate remote file systems, and execute commands. You can suggest commands ' +
    'and explain their effects. Be concise and security-conscious.',
  aiHistoryLength: 50,

  terminalFontSize: 14,
  terminalFontFamily: "'JetBrains Mono', 'Fira Code', monospace",

  defaultSshPort: 22,
  defaultRemotePath: '/',
}
