import { useState } from 'react'
import type { Host, AIRule } from '@/domain/entities'
import { Modal, Input, Button } from '@/presentation/shared'
import { DEFAULT_SSH_PORT } from '@/config'
import { HostRulesPanel } from '@/presentation/components/ai/HostRulesPanel'
import { useVaultStore } from '@/application/stores'

interface AddHostModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (host: Host) => void
  editHost?: Host
}

interface FormErrors {
  label?: string
  hostname?: string
  username?: string
  port?: string
}

export function AddHostModal({ isOpen, onClose, onSave, editHost }: AddHostModalProps) {
  const { entries: vaultEntries } = useVaultStore()
  const privateKeyEntries = vaultEntries.filter((e) => e.type === 'privateKey')

  const [label, setLabel] = useState(editHost?.label ?? '')
  const [hostname, setHostname] = useState(editHost?.hostname ?? '')
  const [port, setPort] = useState(String(editHost?.port ?? DEFAULT_SSH_PORT))
  const [username, setUsername] = useState(editHost?.username ?? '')
  const [authMethod, setAuthMethod] = useState<'password' | 'privateKey'>(
    editHost?.authMethod ?? 'password',
  )
  const [vaultEntryId, setVaultEntryId] = useState(editHost?.vaultEntryId ?? '')
  const [password, setPassword]         = useState(editHost?.password ?? '')
  const [showPassword, setShowPassword] = useState(false)
  const [tags, setTags] = useState(editHost?.tags.join(', ') ?? '')
  const [aiRules, setAiRules] = useState<AIRule[]>(editHost?.aiRules ?? [])
  const [activeTab, setActiveTab] = useState<'connection' | 'rules'>('connection')
  const [errors, setErrors] = useState<FormErrors>({})

  const validate = (): boolean => {
    const newErrors: FormErrors = {}
    if (!label.trim()) newErrors.label = 'Label is required'
    if (!hostname.trim()) newErrors.hostname = 'Hostname is required'
    if (!username.trim()) newErrors.username = 'Username is required'
    const portNum = parseInt(port, 10)
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      newErrors.port = 'Port must be 1-65535'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return

    const host: Host = {
      id: editHost?.id ?? crypto.randomUUID(),
      label: label.trim(),
      hostname: hostname.trim(),
      port: parseInt(port, 10),
      username: username.trim(),
      authMethod,
      password: authMethod === 'password' && password.trim() ? password.trim() : undefined,
      vaultEntryId: authMethod === 'privateKey' && vaultEntryId ? vaultEntryId : undefined,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      aiRules,
      createdAt: editHost?.createdAt ?? new Date(),
    }

    onSave(host)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editHost ? 'Edit Host' : 'Add Host'}>
      {/* Tab bar */}
      <div className="flex gap-0 mb-3" style={{ borderBottom: '1px solid #1d2126' }}>
        {(['connection', 'rules'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-3 py-1.5 text-[0.6875rem] font-medium capitalize transition-colors"
            style={{
              fontFamily: "'Inter', sans-serif",
              color: activeTab === tab ? '#a8e8ff' : '#56687a',
              borderBottom: activeTab === tab ? '2px solid #a8e8ff' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {tab === 'rules' ? (
              <span className="flex items-center gap-1">
                AI Rules
                {aiRules.length > 0 && (
                  <span
                    className="inline-flex items-center justify-center rounded-full text-[0.5rem] font-bold"
                    style={{ background: '#a8e8ff', color: '#0c0e11', width: 14, height: 14, fontFamily: "'Inter', sans-serif" }}
                  >
                    {aiRules.length}
                  </span>
                )}
              </span>
            ) : 'Connection'}
          </button>
        ))}
      </div>

      {activeTab === 'connection' && (
        <div className="flex flex-col gap-3">
          <Input label="Label" value={label} onChange={setLabel} placeholder="My Server" error={errors.label} />
          <Input label="Hostname" value={hostname} onChange={setHostname} placeholder="192.168.1.1" error={errors.hostname} />
          <Input label="Port" value={port} onChange={setPort} placeholder="22" type="number" error={errors.port} />
          <Input label="Username" value={username} onChange={setUsername} placeholder="root" error={errors.username} />

        <div className="flex flex-col gap-1">
          <label className="text-sm text-text-secondary font-medium">Auth Method</label>
          <select
            value={authMethod}
            onChange={(e) => setAuthMethod(e.target.value as 'password' | 'privateKey')}
            className="rounded bg-surface-tertiary border border-border-default px-3 py-1.5 text-sm text-text-primary"
          >
            <option value="password">Password</option>
            <option value="privateKey">Private Key</option>
          </select>
        </div>

        {authMethod === 'password' && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: '#8a9bb0' }}>Password</label>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded" style={{ background: '#1d2126', border: '1px solid #3c494e' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="SSH password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="flex-1 bg-transparent outline-none text-[0.6875rem] text-text-primary placeholder:text-text-muted"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8a9bb0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8a9bb0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}

        {authMethod === 'privateKey' && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-[0.6875rem] font-medium" style={{ color: '#8a9bb0', fontFamily: "'Inter', sans-serif" }}>
                Private Key (from Vault)
              </label>
              <button
                type="button"
                onClick={onClose}
                className="text-[0.625rem] transition-opacity hover:opacity-70"
                style={{ color: '#a8e8ff', fontFamily: "'Inter', sans-serif" }}
              >
                Manage Vault →
              </button>
            </div>
            {privateKeyEntries.length === 0 ? (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded"
                style={{ background: '#1d2126', border: '1px dashed #3c494e' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#56687a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span className="text-[0.6875rem]" style={{ color: '#56687a', fontFamily: "'Inter', sans-serif" }}>
                  No private keys in vault —{' '}
                  <button
                    type="button"
                    className="underline transition-opacity hover:opacity-70"
                    style={{ color: '#a8e8ff' }}
                    onClick={onClose}
                  >
                    add one first
                  </button>
                </span>
              </div>
            ) : (
              <select
                value={vaultEntryId}
                onChange={(e) => setVaultEntryId(e.target.value)}
                className="rounded px-3 py-1.5 text-[0.6875rem] text-text-primary w-full"
                style={{
                  background: '#1d2126',
                  border: '1px solid #3c494e',
                  fontFamily: "'JetBrains Mono', monospace",
                  color: vaultEntryId ? '#e2e2e6' : '#56687a',
                }}
              >
                <option value="">Select a key from vault…</option>
                {privateKeyEntries.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        <Input label="Tags (comma-separated)" value={tags} onChange={setTags} placeholder="production, web" />

          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit}>{editHost ? 'Update' : 'Add Host'}</Button>
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="flex flex-col gap-3">
          <p className="text-[0.6rem] leading-relaxed" style={{ color: '#56687a', fontFamily: "'Inter', sans-serif" }}>
            Rules are injected into the AI agent's system prompt whenever you connect to this host. The AI will always follow them.
          </p>
          <HostRulesPanel rules={aiRules} onChange={setAiRules} />
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit}>{editHost ? 'Update' : 'Add Host'}</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
