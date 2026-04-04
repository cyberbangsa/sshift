import { useSettingsStore } from '@/application/stores'

const FONT_FAMILIES = [
  { label: 'JetBrains Mono', value: "'JetBrains Mono', 'Fira Code', monospace" },
  { label: 'Fira Code',      value: "'Fira Code', 'JetBrains Mono', monospace" },
  { label: 'Cascadia Code',  value: "'Cascadia Code', 'JetBrains Mono', monospace" },
  { label: 'Menlo',          value: "Menlo, 'JetBrains Mono', monospace" },
  { label: 'Consolas',       value: "Consolas, 'JetBrains Mono', monospace" },
]

export function TerminalSettingsSection() {
  const { settings, updateSettings } = useSettingsStore()

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      {/* Font Size */}
      <section>
        <h3 className="text-[0.6875rem] font-semibold tracking-[0.12em] uppercase mb-3" style={{ color: '#56687a' }}>
          Font Size
        </h3>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={10}
            max={24}
            step={1}
            value={settings.terminalFontSize}
            onChange={(e) => updateSettings({ terminalFontSize: Number(e.target.value) })}
            className="flex-1 accent-cyan-400"
          />
          <div
            className="w-[72px] px-2 py-1.5 rounded text-center text-[0.8125rem]"
            style={{ background: '#161a1e', border: '1px solid #1d2126', color: '#e2e2e6', fontFamily: "'JetBrains Mono', monospace" }}
          >
            {settings.terminalFontSize}px
          </div>
        </div>
        {/* Preview */}
        <div
          className="mt-3 px-3 py-2.5 rounded text-[0.75rem]"
          style={{
            background: '#0c0e11',
            border: '1px solid #1d2126',
            color: '#22c55e',
            fontFamily: settings.terminalFontFamily,
            fontSize: `${settings.terminalFontSize}px`,
          }}
        >
          <span style={{ color: '#a8e8ff' }}>user@server</span>
          <span style={{ color: '#56687a' }}>:</span>
          <span style={{ color: '#8a9bb0' }}>~</span>
          <span style={{ color: '#56687a' }}>$</span>{' '}
          <span style={{ color: '#e2e2e6' }}>ls -la /etc</span>
        </div>
      </section>

      {/* Font Family */}
      <section>
        <h3 className="text-[0.6875rem] font-semibold tracking-[0.12em] uppercase mb-3" style={{ color: '#56687a' }}>
          Font Family
        </h3>
        <div className="flex flex-col gap-1.5">
          {FONT_FAMILIES.map((f) => (
            <button
              key={f.value}
              onClick={() => updateSettings({ terminalFontFamily: f.value })}
              className="flex items-center gap-3 px-3 py-2.5 rounded text-left transition-colors hover:bg-white/5"
              style={{
                background: settings.terminalFontFamily === f.value ? 'rgba(168,232,255,0.06)' : 'transparent',
                border: settings.terminalFontFamily === f.value ? '1px solid rgba(168,232,255,0.2)' : '1px solid #1d2126',
              }}
            >
              <span
                className="w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center"
                style={{
                  borderColor: settings.terminalFontFamily === f.value ? '#a8e8ff' : '#56687a',
                  background: settings.terminalFontFamily === f.value ? '#a8e8ff' : 'transparent',
                }}
              />
              <span
                className="flex-1 text-[0.8125rem]"
                style={{ color: '#e2e2e6', fontFamily: "'Inter', sans-serif" }}
              >
                {f.label}
              </span>
              <span
                className="text-[0.75rem]"
                style={{ color: '#56687a', fontFamily: f.value }}
              >
                ls -la ~/
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
