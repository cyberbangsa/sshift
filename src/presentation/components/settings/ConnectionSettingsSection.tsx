import { useSettingsStore } from '@/application/stores'

interface FieldProps {
  label: string
  description: string
  children: React.ReactNode
}

function Field({ label, description, children }: FieldProps) {
  return (
    <div className="flex items-start justify-between gap-8">
      <div className="flex-1 min-w-0">
        <p
          className="text-[0.8125rem] font-medium mb-0.5"
          style={{ color: '#e2e2e6', fontFamily: "'Inter', sans-serif" }}
        >
          {label}
        </p>
        <p
          className="text-[0.75rem]"
          style={{ color: '#56687a', fontFamily: "'Inter', sans-serif" }}
        >
          {description}
        </p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: '#161a1e',
  border: '1px solid #1d2126',
  color: '#e2e2e6',
  fontFamily: "'JetBrains Mono', monospace",
  caretColor: '#a8e8ff',
  outline: 'none',
  borderRadius: '6px',
  padding: '6px 10px',
  fontSize: '0.8125rem',
}

export function ConnectionSettingsSection() {
  const { settings, updateSettings } = useSettingsStore()

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <Field
        label="Default SSH Port"
        description="Used when adding a new host without specifying a port."
      >
        <input
          type="number"
          min={1}
          max={65535}
          value={settings.defaultSshPort}
          onChange={(e) => updateSettings({ defaultSshPort: Number(e.target.value) })}
          className="w-[90px] text-center"
          style={inputStyle}
        />
      </Field>

      <div style={{ height: '1px', background: '#1d2126' }} />

      <Field
        label="Default Remote Path"
        description="The initial directory opened in the file explorer when a session starts."
      >
        <input
          type="text"
          value={settings.defaultRemotePath}
          onChange={(e) => updateSettings({ defaultRemotePath: e.target.value })}
          className="w-[180px]"
          style={inputStyle}
        />
      </Field>
    </div>
  )
}
