/**
 * Singleton repository instances.
 * Automatically selects Tauri implementations when running as a native app,
 * and falls back to local/mock implementations in browser dev mode.
 */

import type { ISessionRepository, IVaultRepository } from '@/domain/repositories'
import { TauriSessionRepository, TauriVaultRepository } from './tauri'
import { LocalStorageRepository, LocalSessionRepository } from './storage'

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export const hostRepository = new LocalStorageRepository()

export const sessionRepository: ISessionRepository = isTauri
  ? new TauriSessionRepository()
  : new LocalSessionRepository()

export const vaultRepository: IVaultRepository = isTauri
  ? new TauriVaultRepository()
  : // Browser dev fallback — no-op implementation (vault requires the native app)
    {
      getAll: async () => [],
      add: async () => {
        throw new Error('Vault requires the native app')
      },
      rename: async () => {},
      delete: async () => {},
    }
