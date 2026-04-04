import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import type { Settings } from '@/domain/entities'
import { DEFAULT_SETTINGS } from '@/domain/entities'

const STORAGE_KEY = 'sshift:settings'

function loadFromStorage(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as Settings
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function saveToStorage(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // ignore quota/security errors
  }
}

/** Check whether we're running inside Tauri */
const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

interface SettingsState {
  settings: Settings
  /** Loaded API key — kept in memory only, never in localStorage */
  openRouterApiKey: string | null
  isApiKeyLoaded: boolean
  isSaving: boolean
  error: string | null
}

interface SettingsActions {
  /** Update one or more settings fields and persist to localStorage */
  updateSettings: (patch: Partial<Settings>) => void
  /** Load the API key from the OS keychain (Tauri only) */
  loadApiKey: () => Promise<void>
  /** Store a new API key in the OS keychain and keep it in memory */
  saveApiKey: (key: string) => Promise<void>
  /** Remove the API key from the OS keychain and clear memory */
  deleteApiKey: () => Promise<void>
  clearError: () => void
}

export type SettingsStore = SettingsState & SettingsActions

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: loadFromStorage(),
  openRouterApiKey: null,
  isApiKeyLoaded: false,
  isSaving: false,
  error: null,

  updateSettings: (patch) => {
    const next = { ...get().settings, ...patch }
    set({ settings: next })
    saveToStorage(next)
  },

  loadApiKey: async () => {
    if (!isTauri()) return
    try {
      const key = await invoke<string | null>('get_api_key', { provider: 'openrouter' })
      set({ openRouterApiKey: key, isApiKeyLoaded: true })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e), isApiKeyLoaded: true })
    }
  },

  saveApiKey: async (key: string) => {
    if (!isTauri()) {
      set({ openRouterApiKey: key })
      return
    }
    set({ isSaving: true, error: null })
    try {
      await invoke('set_api_key', { provider: 'openrouter', key })
      set({ openRouterApiKey: key })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) })
    } finally {
      set({ isSaving: false })
    }
  },

  deleteApiKey: async () => {
    if (!isTauri()) {
      set({ openRouterApiKey: null })
      return
    }
    set({ isSaving: true, error: null })
    try {
      await invoke('delete_api_key', { provider: 'openrouter' })
      set({ openRouterApiKey: null })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) })
    } finally {
      set({ isSaving: false })
    }
  },

  clearError: () => set({ error: null }),
}))
