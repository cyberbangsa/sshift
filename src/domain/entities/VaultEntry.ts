export type VaultEntryType = 'privateKey' | 'publicKey'

export interface VaultEntry {
  id: string
  name: string
  type: VaultEntryType
  createdAt: Date
}
