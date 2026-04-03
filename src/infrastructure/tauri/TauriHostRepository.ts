import { invoke } from '@tauri-apps/api/core'
import type { Host } from '@/domain/entities'
import type { IHostRepository } from '@/domain/repositories'

export class TauriHostRepository implements IHostRepository {
  async getAll(): Promise<Host[]> {
    const hosts = await invoke<Host[]>('get_all_hosts')
    return hosts.map(this.deserializeHost)
  }

  async getById(id: string): Promise<Host | null> {
    const host = await invoke<Host | null>('get_host_by_id', { id })
    return host ? this.deserializeHost(host) : null
  }

  async save(host: Host): Promise<void> {
    await invoke('save_host', { host: this.serializeHost(host) })
  }

  async delete(id: string): Promise<void> {
    await invoke('delete_host', { id })
  }

  private serializeHost(host: Host): Record<string, unknown> {
    return {
      ...host,
      createdAt: host.createdAt.toISOString(),
    }
  }

  private deserializeHost(raw: Host): Host {
    return {
      ...raw,
      createdAt: new Date(raw.createdAt),
    }
  }
}
