import { useRef, useState } from 'react'
import type { Host, AIRule } from '@/domain/entities'
import { Modal, Input, Button } from '@/presentation/shared'
import { DEFAULT_SSH_PORT } from '@/config'
import { HostRulesPanel } from '@/presentation/components/ai/HostRulesPanel'

/** Opens a native Tauri file picker, returns 'use-file-input' when not in Tauri. */
async function pickKeyFile(): Promise<string | null | 'use-file-input'> {
  // Only attempt Tauri dialog when the Tauri IPC bridge is present
  if (typeof window === 'undefined' || !(window as Record<string, unknown>)['__TAURI_INTERNALS__']) {
    return 'use-file-input'
  }
  try {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const selected = await open({
      title: 'Select Private Key',
      multiple: false,
      filters: [
        { name: 'Private Key', extensions: ['pem', 'ppk', 'key', 'rsa', 'ed25519', '*'] },
      ],
    })
    return typeof selected === 'string' ? selected : null
  } catch {
    return 'use-file-input'
  }
}

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
  const [label, setLabel] = useState(editHost?.label ?? '')
  const [hostname, setHostname] = useState(editHost?.hostname ?? '')
  const [port, setPort] = useState(String(editHost?.port ?? DEFAULT_SSH_PORT))
  const [username, setUsername] = useState(editHost?.username ?? '')
  const [authMethod, setAuthMethod] = useState<'password' | 'privateKey'>(
    editHost?.authMethod ?? 'password',
  )
  const [privateKeyPath, setPrivateKeyPath] = useState(editHost?.privateKeyPath ?? '')
  const [password, setPassword]             = useState(editHost?.password ?? '')
  const [showPassword, setShowPassword]     = useState(false)
  const [tags, setTags] = useState(editHost?.tags.join(', ') ?? '')
  const [aiRules, setAiRules] = useState<AIRule[]>(editHost?.aiRules ?? [])
  const [activeTab, setActiveTab] = useState<'connection' | 'rules'>('connection')
  const [errors, setErrors] = useState<FormErrors>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleBrowseKey = async () => {
    const result = await pickKeyFile()
    if (result === 'use-file-input') {
      // Browser fallback: trigger hidden file input
      fileInputRef.current?.click()
    } else if (result !== null) {
      // Tauri: got a real absolute path
      setPrivateKeyPath(result)
    }
    // result === null means user cancelled the Tauri dialog — do nothing
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setPrivateKeyPath(file.name)
  }

  /** Derive a short display name from the full path */
  const keyDisplayName = privateKeyPath
    ? privateKeyPath.replace(/\\/g, '/').split('/').pop() ?? privateKeyPath
    : ''

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
      privateKeyPath: authMethod === 'privateKey' ? privateKeyPath.trim() : undefined,
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
            <label className="text-sm font-medium" style={{ color: '#8a9bb0' }}>
              Private Key
            </label>
            {/* Hidden browser fallback */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pem,.ppk,.key,.rsa,.ed25519"
              className="hidden"
              onChange={handleFileInputChange}
            />
            <div className="flex items-center gap-2">
              {/* Path display */}
              <div
                className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded overflow-hidden"
                style={{ background: '#1d2126', border: '1px solid #3c494e' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a8e8ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
                {keyDisplayName ? (
                  <span
                    className="text-[0.6875rem] truncate"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: '#e2e2e6' }}
                    title={privateKeyPath}
                  >
                    {keyDisplayName}
                  </span>
                ) : (
                  <span
                    className="text-[0.6875rem]"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: '#56687a' }}
                  >
                    No key selected…
                  </span>
                )}
                {keyDisplayName && (
                  <button
                    onClick={() => setPrivateKeyPath('')}
                    className="ml-auto shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                    title="Clear"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8a9bb0" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
              {/* Browse button */}
              <button
                onClick={handleBrowseKey}
                className="shrink-0 px-3 py-1.5 rounded text-[0.6875rem] font-semibold transition-opacity hover:opacity-90"
                style={{
                  background: 'linear-gradient(135deg, #a8e8ff, #00d4ff)',
                  color: '#0c0e11',
                  borderRadius: '4px',
                  fontFamily: "'Inter', sans-serif",
                  letterSpacing: '0.05em',
                }}
              >
                Browse…
              </button>
            </div>
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
