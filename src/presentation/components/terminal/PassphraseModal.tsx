import { useState, useEffect, useRef, useCallback } from 'react'
import { Modal } from '@/presentation/shared'

interface PassphraseModalProps {
  hostname: string
  username: string
  isConnecting: boolean
  onConfirm: (passphrase: string) => void
  onCancel: () => void
}

export function PassphraseModal({
  hostname,
  username,
  isConnecting,
  onConfirm,
  onCancel,
}: PassphraseModalProps) {
  const [passphrase, setPassphrase] = useState('')
  const [showPassphrase, setShowPassphrase] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Slight delay so the modal animation completes before focusing
    const t = setTimeout(() => inputRef.current?.focus(), 60)
    return () => clearTimeout(t)
  }, [])

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault()
      if (!passphrase.trim() || isConnecting) return
      onConfirm(passphrase)
    },
    [passphrase, isConnecting, onConfirm],
  )

  return (
    <Modal isOpen onClose={onCancel} title="Key Passphrase Required">
      <div className="flex flex-col gap-4">
        {/* Description */}
        <p
          className="text-[0.6875rem] leading-relaxed"
          style={{ color: '#8a9bb0', fontFamily: "'Inter', sans-serif" }}
        >
          The private key for{' '}
          <span style={{ color: '#a8e8ff' }}>
            {username}@{hostname}
          </span>{' '}
          is encrypted. Enter its passphrase to connect.
          The passphrase will be remembered for this session.
        </p>

        {/* Key icon + passphrase input */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="passphrase-input"
              className="text-[0.6875rem] font-medium"
              style={{ color: '#8a9bb0', fontFamily: "'Inter', sans-serif" }}
            >
              Passphrase
            </label>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded"
              style={{ background: '#1d2126', border: '1px solid #2e3a42' }}
            >
              {/* Lock icon */}
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#56687a"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                ref={inputRef}
                id="passphrase-input"
                type={showPassphrase ? 'text' : 'password'}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter passphrase…"
                autoComplete="off"
                spellCheck={false}
                className="flex-1 bg-transparent outline-none text-[0.75rem]"
                style={{
                  color: '#e2e2e6',
                  fontFamily: "'JetBrains Mono', monospace",
                  caretColor: '#a8e8ff',
                }}
              />
              {/* Show/hide toggle */}
              <button
                type="button"
                onClick={() => setShowPassphrase((v) => !v)}
                className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                title={showPassphrase ? 'Hide passphrase' : 'Show passphrase'}
              >
                {showPassphrase ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8a9bb0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8a9bb0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={isConnecting}
              className="px-3 py-1.5 text-[0.6875rem] rounded transition-colors disabled:opacity-40"
              style={{
                background: 'transparent',
                border: '1px solid #2e3a42',
                color: '#8a9bb0',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!passphrase.trim() || isConnecting}
              className="px-4 py-1.5 text-[0.6875rem] font-semibold rounded transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #a8e8ff, #00d4ff)',
                color: '#0c0e11',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {isConnecting ? 'Connecting…' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
