import { useEffect, useState } from 'react'
import { useVault } from '@/application/hooks'
import { vaultRepository } from '@/infrastructure/repositories'
import { Button } from '@/presentation/shared'
import { VaultEntryCard, VaultEntryForm } from '@/presentation/components/vault'
import type { VaultEntryType } from '@/domain/entities'

export function Vault() {
  const { entries, isLoading, error, loadVault, addVaultEntry, renameVaultEntry, deleteVaultEntry } =
    useVault(vaultRepository)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [filter, setFilter] = useState<VaultEntryType | 'all'>('all')

  useEffect(() => {
    loadVault()
  }, [loadVault])

  const filtered = filter === 'all' ? entries : entries.filter((e) => e.type === filter)

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#111317' }}>
      {/* Section header */}
      <div
        className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: '1px solid #1d2126' }}
      >
        <div>
          <h2
            className="text-base font-semibold"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#e2e2e6' }}
          >
            Credential Vault
          </h2>
          <p
            className="text-[0.6875rem] mt-0.5"
            style={{ color: '#56687a', fontFamily: "'Inter', sans-serif" }}
          >
            SSH keys stored inside the app's secure data directory
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter tabs */}
          <div
            className="flex rounded overflow-hidden"
            style={{ border: '1px solid #1d2126' }}
          >
            {(['all', 'privateKey', 'publicKey'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1 text-[0.6875rem] transition-colors"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  background: filter === f ? '#1d2126' : 'transparent',
                  color: filter === f ? '#a8e8ff' : '#56687a',
                  borderRight: f !== 'publicKey' ? '1px solid #1d2126' : undefined,
                }}
              >
                {f === 'all' ? 'All' : f === 'privateKey' ? 'Private Keys' : 'Public Keys'}
              </button>
            ))}
          </div>

          <Button variant="primary" size="sm" onClick={() => setIsFormOpen(true)}>
            + Add Key
          </Button>
        </div>
      </div>

      {/* Body */}
      <main className="flex-1 overflow-y-auto px-6 py-5">
        {/* Error */}
        {error && (
          <div
            className="mb-4 rounded px-3 py-2 text-[0.6875rem]"
            style={{ background: '#2d1a1a', border: '1px solid #5c2626', color: '#ff6b6b' }}
          >
            {error}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <p className="text-[0.6875rem]" style={{ color: '#56687a' }}>Loading vault…</p>
        )}

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-20 rounded-lg"
            style={{ border: '1px dashed #1d2126' }}
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#3c494e"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mb-4"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <p className="text-sm" style={{ color: '#56687a' }}>
              {filter === 'all' ? 'No keys in vault yet' : `No ${filter === 'privateKey' ? 'private' : 'public'} keys`}
            </p>
            <button
              onClick={() => setIsFormOpen(true)}
              className="mt-3 text-[0.6875rem] transition-opacity hover:opacity-70"
              style={{ color: '#a8e8ff' }}
            >
              Add your first key →
            </button>
          </div>
        )}

        {/* Entry list */}
        {!isLoading && filtered.length > 0 && (
          <div className="flex flex-col gap-2 max-w-2xl">
            {filtered.map((entry) => (
              <VaultEntryCard
                key={entry.id}
                entry={entry}
                onRename={renameVaultEntry}
                onDelete={deleteVaultEntry}
              />
            ))}
          </div>
        )}
      </main>

      {/* Add key modal */}
      <VaultEntryForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={async (name, type, content) => { await addVaultEntry(name, type, content) }}
      />
    </div>
  )
}
