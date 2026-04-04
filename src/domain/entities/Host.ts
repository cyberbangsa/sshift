export interface AIRule {
  id: string
  name: string
  content: string
}

export interface Host {
  id: string
  label: string
  hostname: string
  port: number
  username: string
  authMethod: 'password' | 'privateKey'
  /** SSH password — stored client-side only, never sent to Rust host persistence */
  password?: string
  /** @deprecated Use vaultEntryId instead. Kept for backward-compatibility. */
  privateKeyPath?: string
  /** ID of the vault entry whose key file is used for private-key auth. */
  vaultEntryId?: string
  tags: string[]
  /** Per-host rules injected into the AI agent's system prompt */
  aiRules?: AIRule[]
  createdAt: Date
}
