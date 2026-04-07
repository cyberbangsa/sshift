import { useState } from 'react'
import { Modal, Input, Button } from '@/presentation/shared'
import type { VaultEntryType } from '@/domain/entities'

interface VaultEntryFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, type: VaultEntryType, content: string) => Promise<void>
}

export function VaultEntryForm({ isOpen, onClose, onSave }: VaultEntryFormProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<VaultEntryType>('privateKey')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setContent(ev.target?.result as string)
    reader.readAsText(file)
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    if (!content.trim()) {
      setError('Key content is required — paste or upload a key file')
      return
    }
    setError(null)
    setIsSaving(true)
    try {
      // Normalize line endings and ensure a trailing newline so libssh2 can
      // reliably parse both RSA (PEM) and Ed25519 (OpenSSH) key files.
      const normalizedContent =
        content.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n') + '\n'
      await onSave(name.trim(), type, normalizedContent)
      setName('')
      setContent('')
      setType('privateKey')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save vault entry')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Key to Vault">
      <div className="flex flex-col gap-3">
        <Input label="Name" value={name} onChange={setName} placeholder="e.g. My AWS Key" />

        {/* Type selector */}
        <div className="flex flex-col gap-1">
          <label
            className="text-[0.6875rem] font-medium"
            style={{ color: '#8a9bb0', fontFamily: "'Inter', sans-serif" }}
          >
            Key Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as VaultEntryType)}
            className="rounded px-3 py-1.5 text-[0.6875rem] text-text-primary"
            style={{
              background: '#1d2126',
              border: '1px solid #3c494e',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <option value="privateKey">Private Key</option>
            <option value="publicKey">Public Key</option>
          </select>
        </div>

        {/* Key content */}
        <div className="flex flex-col gap-1">
          <label
            className="text-[0.6875rem] font-medium"
            style={{ color: '#8a9bb0', fontFamily: "'Inter', sans-serif" }}
          >
            Key Content
          </label>
          <textarea
            rows={7}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;..."
            className="w-full rounded px-3 py-2 text-[0.6875rem] placeholder:text-text-muted resize-none outline-none"
            style={{
              background: '#1d2126',
              border: '1px solid #3c494e',
              color: '#c8d3de',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          />
          {/* File upload shortcut */}
          <label
            className="cursor-pointer self-start text-[0.6875rem] transition-colors hover:opacity-80"
            style={{ color: '#a8e8ff', fontFamily: "'Inter', sans-serif" }}
          >
            Or upload key file…
            <input type="file" className="hidden" onChange={handleFileChange} />
          </label>
        </div>

        {error && (
          <p className="text-[0.6875rem]" style={{ color: '#ff6b6b' }}>
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save to Vault'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
