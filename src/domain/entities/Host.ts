export interface Host {
  id: string
  label: string
  hostname: string
  port: number
  username: string
  authMethod: 'password' | 'privateKey'
  /** SSH password — stored client-side only, never sent to Rust host persistence */
  password?: string
  privateKeyPath?: string
  tags: string[]
  createdAt: Date
}
