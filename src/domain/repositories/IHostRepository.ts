import type { Host } from '@/domain/entities'

export interface IHostRepository {
  getAll(): Promise<Host[]>
  getById(id: string): Promise<Host | null>
  save(host: Host): Promise<void>
  delete(id: string): Promise<void>
}
