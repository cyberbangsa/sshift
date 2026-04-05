import { invoke } from '@tauri-apps/api/core'
import type { VaultEntry, VaultEntryType } from '@/domain/entities'
import type { IVaultRepository } from '@/domain/repositories'

export class TauriVaultRepository implements IVaultRepository {
  async getAll(): Promise<VaultEntry[]> {
    const entries = await invoke<VaultEntry[]>('get_all_vault_entries')
    return entries.map(this.deserialize)
  }

  async add(name: string, type: VaultEntryType, content: string): Promise<VaultEntry> {
    const entry = await invoke<VaultEntry>('add_vault_entry', {
      name,
      entryType: type,
      content,
    })
    return this.deserialize(entry)
  }

  async rename(id: string, name: string): Promise<void> {
    await invoke('rename_vault_entry', { id, name })
  }

  async delete(id: string): Promise<void> {
    await invoke('delete_vault_entry', { id })
  }

  private deserialize(raw: VaultEntry): VaultEntry {
    return {
      ...raw,
      createdAt: new Date(raw.createdAt),
    }
  }
}
