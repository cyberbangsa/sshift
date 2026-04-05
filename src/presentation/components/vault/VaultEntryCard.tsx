import { useState } from 'react'
import type { VaultEntry } from '@/domain/entities'
import { Button, Input } from '@/presentation/shared'

interface VaultEntryCardProps {
  entry: VaultEntry
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}

const TYPE_LABEL: Record<VaultEntry['type'], string> = {
  privateKey: 'Private Key',
  publicKey: 'Public Key',
}

const TYPE_COLOR: Record<VaultEntry['type'], string> = {
  privateKey: '#ffd580',
  publicKey: '#a8e8ff',
}

// Lock / key icon
function KeyIcon({ type }: { type: VaultEntry['type'] }) {
  const color = TYPE_COLOR[type]
  return type === 'privateKey' ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

export function VaultEntryCard({ entry, onRename, onDelete }: VaultEntryCardProps) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [newName, setNewName] = useState(entry.name)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleRename = () => {
    if (newName.trim() && newName.trim() !== entry.name) {
      onRename(entry.id, newName.trim())
    }
    setIsRenaming(false)
  }

  return (
    <div
      className="flex items-center gap-3 rounded-md px-3 py-2.5 group"
      style={{ background: '#111317', border: '1px solid #1d2126' }}
    >
      {/* Icon */}
      <div className="shrink-0">
        <KeyIcon type={entry.type} />
      </div>

      {/* Name / rename inline */}
      <div className="flex-1 min-w-0">
        {isRenaming ? (
          <div className="flex items-center gap-2">
            <Input
              value={newName}
              onChange={setNewName}
              placeholder="Entry name"
              autoFocus
            />
            <Button variant="primary" size="sm" onClick={handleRename}>Save</Button>
            <Button variant="ghost" size="sm" onClick={() => { setIsRenaming(false); setNewName(entry.name) }}>×</Button>
          </div>
        ) : (
          <>
            <p
              className="text-[0.6875rem] font-medium truncate"
              style={{ color: '#c8d3de', fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {entry.name}
            </p>
            <p
              className="text-[0.625rem] mt-0.5"
              style={{ color: TYPE_COLOR[entry.type], fontFamily: "'Inter', sans-serif" }}
            >
              {TYPE_LABEL[entry.type]}
            </p>
          </>
        )}
      </div>

      {/* Created date */}
      {!isRenaming && (
        <span
          className="shrink-0 text-[0.6rem]"
          style={{ color: '#56687a', fontFamily: "'Inter', sans-serif" }}
        >
          {entry.createdAt.toLocaleDateString()}
        </span>
      )}

      {/* Actions */}
      {!isRenaming && !confirmDelete && (
        <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsRenaming(true)}
            className="p-1 rounded hover:bg-white/5 transition-colors"
            title="Rename"
            style={{ color: '#8a9bb0' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-1 rounded hover:bg-white/5 transition-colors"
            title="Delete"
            style={{ color: '#ff6b6b' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="shrink-0 flex items-center gap-2">
          <span className="text-[0.625rem]" style={{ color: '#ff6b6b' }}>Delete?</span>
          <Button variant="danger" size="sm" onClick={() => onDelete(entry.id)}>Yes</Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>No</Button>
        </div>
      )}
    </div>
  )
}
