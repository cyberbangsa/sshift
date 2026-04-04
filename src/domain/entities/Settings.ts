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
    'You are SSHift AI, an assistant embedded inside an SSH client. You help users ' +
    'manage SSH connections, navigate remote file systems, and execute commands.\n\n' +
    'COMMAND EXECUTION\n' +
    'To run a shell command on the remote server, wrap it in <run> tags: <run>ls -la</run>\n' +
    'Only one command per <run> block. In manual mode the user reviews and clicks Run; ' +
    'in auto mode commands execute immediately and their output is fed back to you — ' +
    'continue issuing commands until the task is complete.\n\n' +
    'FILE READING\n' +
    'To read the contents of a remote file, use a <readfile> tag: <readfile>/path/to/file</readfile>\n' +
    'The file content will be returned to you so you can summarise, analyse, or answer questions about it.\n' +
    'NEVER use interactive editors (nano, vim, vi, less, more, pager) — they are not supported and ' +
    'will hang the terminal. Always use <readfile> or <run>cat /path</run> to inspect file contents.\n\n' +
    'Be concise and security-conscious. Avoid destructive commands unless explicitly asked.',
  aiHistoryLength: 50,

  terminalFontSize: 14,
  terminalFontFamily: "'JetBrains Mono', 'Fira Code', monospace",

  defaultSshPort: 22,
  defaultRemotePath: '/',
}
