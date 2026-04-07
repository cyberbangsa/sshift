import { useState, useEffect } from 'react'
import { useSettingsStore } from '@/application/stores'

const PROVIDERS = [
  { id: 'openrouter', label: 'OpenRouter', available: true },
  { id: 'openai', label: 'OpenAI (GPT)', available: false },
  { id: 'google', label: 'Google Gemini', available: false },
  { id: 'anthropic', label: 'Anthropic Claude', available: false },
] as const

const POPULAR_MODELS = [
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'anthropic/claude-3.5-sonnet',
  'google/gemini-pro-1.5',
  'meta-llama/llama-3.1-70b-instruct',
]

export function AISettingsSection() {
  const {
    settings,
    openRouterApiKey,
    isApiKeyLoaded,
    isSaving,
    error,
    updateSettings,
    loadApiKey,
    saveApiKey,
    deleteApiKey,
    clearError,
  } = useSettingsStore()

  const [keyDraft, setKeyDraft] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (!isApiKeyLoaded) {
      loadApiKey()
    }
  }, [isApiKeyLoaded, loadApiKey])

  useEffect(() => {
    if (error) {
      const t = setTimeout(clearError, 5000)
      return () => clearTimeout(t)
    }
  }, [error, clearError])

  const handleSaveKey = async () => {
    if (!keyDraft.trim()) return
    await saveApiKey(keyDraft.trim())
    setKeyDraft('')
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2000)
  }

  const handleDeleteKey = async () => {
    await deleteApiKey()
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      {/* Provider chips */}
      <section>
        <h3
          className="text-[0.6875rem] font-semibold tracking-[0.12em] uppercase mb-3"
          style={{ color: '#56687a' }}
        >
          AI Provider
        </h3>
        <div className="flex flex-wrap gap-2">
          {PROVIDERS.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[0.75rem] font-medium"
              style={{
                background:
                  p.id === 'openrouter' ? 'rgba(168,232,255,0.1)' : 'rgba(255,255,255,0.03)',
                border:
                  p.id === 'openrouter' ? '1px solid rgba(168,232,255,0.3)' : '1px solid #1d2126',
                color: p.id === 'openrouter' ? '#a8e8ff' : '#56687a',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {p.label}
              {!p.available && (
                <span
                  className="text-[0.6rem] px-1.5 py-0.5 rounded"
                  style={{ background: '#1d2126', color: '#56687a' }}
                >
                  Soon
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* OpenRouter API Key */}
      <section>
        <h3
          className="text-[0.6875rem] font-semibold tracking-[0.12em] uppercase mb-1"
          style={{ color: '#56687a' }}
        >
          OpenRouter API Key
        </h3>
        <p
          className="text-[0.75rem] mb-3"
          style={{ color: '#56687a', fontFamily: "'Inter', sans-serif" }}
        >
          Stored securely in the OS keychain. Get your key at{' '}
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#a8e8ff' }}
            className="hover:underline"
          >
            openrouter.ai/keys
          </a>
          .
        </p>

        {/* Stored key indicator */}
        {openRouterApiKey && (
          <div
            className="flex items-center justify-between gap-3 px-3 py-2 rounded mb-3"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: '#22c55e' }}
              />
              <span className="text-[0.75rem] font-mono truncate" style={{ color: '#8a9bb0' }}>
                {showKey ? openRouterApiKey : `sk-or-v1-${'•'.repeat(24)}`}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowKey((v) => !v)}
                className="text-[0.7rem] px-2 py-1 rounded transition-colors hover:bg-white/5"
                style={{ color: '#8a9bb0', fontFamily: "'Inter', sans-serif" }}
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
              <button
                onClick={handleDeleteKey}
                disabled={isSaving}
                className="text-[0.7rem] px-2 py-1 rounded transition-colors hover:bg-red-500/10"
                style={{ color: '#f87171', fontFamily: "'Inter', sans-serif" }}
              >
                Remove
              </button>
            </div>
          </div>
        )}

        {/* New key input */}
        <div className="flex gap-2">
          <div
            className="flex-1 flex items-center gap-2 px-3 py-2 rounded"
            style={{ background: '#161a1e', border: '1px solid #1d2126' }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#56687a"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
            <input
              type={showKey ? 'text' : 'password'}
              placeholder={openRouterApiKey ? 'Enter new key to replace…' : 'sk-or-v1-…'}
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
              className="flex-1 bg-transparent outline-none text-[0.8125rem]"
              style={{
                color: '#e2e2e6',
                fontFamily: "'JetBrains Mono', monospace",
                caretColor: '#a8e8ff',
              }}
            />
          </div>
          <button
            onClick={handleSaveKey}
            disabled={!keyDraft.trim() || isSaving}
            className="px-4 py-2 rounded text-[0.8125rem] font-medium transition-all"
            style={{
              background: keyDraft.trim() ? 'rgba(168,232,255,0.12)' : 'rgba(255,255,255,0.04)',
              border: keyDraft.trim() ? '1px solid rgba(168,232,255,0.3)' : '1px solid #1d2126',
              color: keyDraft.trim() ? '#a8e8ff' : '#56687a',
              fontFamily: "'Inter', sans-serif",
              cursor: keyDraft.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            {isSaving ? 'Saving…' : saveSuccess ? '✓ Saved' : 'Save Key'}
          </button>
        </div>

        {error && (
          <p
            className="mt-2 text-[0.75rem]"
            style={{ color: '#f87171', fontFamily: "'Inter', sans-serif" }}
          >
            {error}
          </p>
        )}
      </section>

      {/* Model */}
      <section>
        <h3
          className="text-[0.6875rem] font-semibold tracking-[0.12em] uppercase mb-1"
          style={{ color: '#56687a' }}
        >
          Model
        </h3>
        <p
          className="text-[0.75rem] mb-3"
          style={{ color: '#56687a', fontFamily: "'Inter', sans-serif" }}
        >
          Any model available on OpenRouter. Browse at{' '}
          <a
            href="https://openrouter.ai/models"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#a8e8ff' }}
            className="hover:underline"
          >
            openrouter.ai/models
          </a>
          .
        </p>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded mb-2"
          style={{ background: '#161a1e', border: '1px solid #1d2126' }}
        >
          <input
            type="text"
            value={settings.aiModel}
            onChange={(e) => updateSettings({ aiModel: e.target.value })}
            className="flex-1 bg-transparent outline-none text-[0.8125rem]"
            style={{
              color: '#e2e2e6',
              fontFamily: "'JetBrains Mono', monospace",
              caretColor: '#a8e8ff',
            }}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_MODELS.map((m) => (
            <button
              key={m}
              onClick={() => updateSettings({ aiModel: m })}
              className="text-[0.7rem] px-2 py-1 rounded transition-colors hover:bg-white/5"
              style={{
                background: settings.aiModel === m ? 'rgba(168,232,255,0.1)' : 'transparent',
                border:
                  settings.aiModel === m ? '1px solid rgba(168,232,255,0.25)' : '1px solid #1d2126',
                color: settings.aiModel === m ? '#a8e8ff' : '#56687a',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </section>

      {/* Max Tokens */}
      <section>
        <h3
          className="text-[0.6875rem] font-semibold tracking-[0.12em] uppercase mb-3"
          style={{ color: '#56687a' }}
        >
          Max Response Tokens
        </h3>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={256}
            max={32768}
            step={256}
            value={settings.aiMaxTokens}
            onChange={(e) => updateSettings({ aiMaxTokens: Number(e.target.value) })}
            className="flex-1 accent-cyan-400"
          />
          <div
            className="w-[72px] px-2 py-1.5 rounded text-center text-[0.8125rem]"
            style={{
              background: '#161a1e',
              border: '1px solid #1d2126',
              color: '#e2e2e6',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {settings.aiMaxTokens.toLocaleString()}
          </div>
        </div>
      </section>

      {/* History Length */}
      <section>
        <h3
          className="text-[0.6875rem] font-semibold tracking-[0.12em] uppercase mb-1"
          style={{ color: '#56687a' }}
        >
          Context History Length
        </h3>
        <p
          className="text-[0.75rem] mb-3"
          style={{ color: '#56687a', fontFamily: "'Inter', sans-serif" }}
        >
          Number of previous messages sent as context with each request.
        </p>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={5}
            max={100}
            step={5}
            value={settings.aiHistoryLength}
            onChange={(e) => updateSettings({ aiHistoryLength: Number(e.target.value) })}
            className="flex-1 accent-cyan-400"
          />
          <div
            className="w-[72px] px-2 py-1.5 rounded text-center text-[0.8125rem]"
            style={{
              background: '#161a1e',
              border: '1px solid #1d2126',
              color: '#e2e2e6',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {settings.aiHistoryLength}
          </div>
        </div>
      </section>

      {/* System Prompt */}
      <section>
        <h3
          className="text-[0.6875rem] font-semibold tracking-[0.12em] uppercase mb-1"
          style={{ color: '#56687a' }}
        >
          System Prompt
        </h3>
        <p
          className="text-[0.75rem] mb-3"
          style={{ color: '#56687a', fontFamily: "'Inter', sans-serif" }}
        >
          Customize how the AI assistant behaves.
        </p>
        <textarea
          value={settings.aiSystemPrompt}
          onChange={(e) => updateSettings({ aiSystemPrompt: e.target.value })}
          rows={5}
          className="w-full px-3 py-2.5 rounded resize-y outline-none text-[0.8125rem] leading-relaxed"
          style={{
            background: '#161a1e',
            border: '1px solid #1d2126',
            color: '#e2e2e6',
            fontFamily: "'Inter', sans-serif",
            caretColor: '#a8e8ff',
            minHeight: '100px',
          }}
        />
      </section>
    </div>
  )
}
