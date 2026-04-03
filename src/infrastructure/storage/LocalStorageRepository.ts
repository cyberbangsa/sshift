import type { Host } from '@/domain/entities'
import type { IHostRepository } from '@/domain/repositories'

const HOSTS_STORAGE_KEY = 'sshift:hosts'

export class LocalStorageRepository implements IHostRepository {
  async getAll(): Promise<Host[]> {
    const raw = localStorage.getItem(HOSTS_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>
    return parsed.map(this.deserializeHost)
  }

  async getById(id: string): Promise<Host | null> {
    const hosts = await this.getAll()
    return hosts.find((h) => h.id === id) ?? null
  }

  async save(host: Host): Promise<void> {
    const hosts = await this.getAll()
    const index = hosts.findIndex((h) => h.id === host.id)
    if (index >= 0) {
      hosts[index] = host
    } else {
      hosts.push(host)
    }
    localStorage.setItem(HOSTS_STORAGE_KEY, JSON.stringify(hosts))
  }

  async delete(id: string): Promise<void> {
    const hosts = await this.getAll()
    const filtered = hosts.filter((h) => h.id !== id)
    localStorage.setItem(HOSTS_STORAGE_KEY, JSON.stringify(filtered))
  }

  private deserializeHost(raw: Record<string, unknown>): Host {
    return {
      ...(raw as unknown as Host),
      createdAt: new Date(raw.createdAt as string),
    }
  }
}
