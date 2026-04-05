/**
 * Singleton repository instances.
 * Automatically selects Tauri implementations when running as a native app,
 * and falls back to local/mock implementations in browser dev mode.
 */

import type { ISessionRepository } from '@/domain/repositories'
import { TauriSessionRepository } from './tauri'
import { LocalStorageRepository, LocalSessionRepository } from './storage'

const isTauri =
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export const hostRepository = new LocalStorageRepository()

export const sessionRepository: ISessionRepository = isTauri
  ? new TauriSessionRepository()
  : new LocalSessionRepository()
