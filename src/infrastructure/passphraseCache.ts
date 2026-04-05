/**
 * In-memory passphrase cache keyed by vault entry ID.
 * Passphrases are never persisted — they live only for the current app session.
 */
const cache = new Map<string, string>()

export const passphraseCache = {
  get(vaultEntryId: string): string | undefined {
    return cache.get(vaultEntryId)
  },
  set(vaultEntryId: string, passphrase: string): void {
    cache.set(vaultEntryId, passphrase)
  },
  clear(vaultEntryId: string): void {
    cache.delete(vaultEntryId)
  },
}
