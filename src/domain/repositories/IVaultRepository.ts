import type { VaultEntry, VaultEntryType } from '@/domain/entities'

export interface IVaultRepository {
  getAll(): Promise<VaultEntry[]>
  add(name: string, type: VaultEntryType, content: string): Promise<VaultEntry>
  rename(id: string, name: string): Promise<void>
  delete(id: string): Promise<void>
}
