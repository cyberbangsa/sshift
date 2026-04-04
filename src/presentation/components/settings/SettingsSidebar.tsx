const SECTIONS = [
  {
    id: 'ai',
    label: 'AI Agent',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 0 2h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1 0-2h1a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2z" />
        <circle cx="9" cy="13" r="1" /><circle cx="15" cy="13" r="1" />
      </svg>
    ),
  },
  {
    id: 'terminal',
    label: 'Terminal',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    ),
  },
  {
    id: 'connections',
    label: 'Connections',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><circle cx="12" cy="20" r="1" />
      </svg>
    ),
  },
] as const

export type SettingsSection = (typeof SECTIONS)[number]['id']

interface Props {
  activeSection: SettingsSection
  onSelect: (s: SettingsSection) => void
}

export function SettingsSidebar({ activeSection, onSelect }: Props) {
  return (
    <nav
      className="w-[200px] shrink-0 flex flex-col py-4 gap-0.5"
      style={{ borderRight: '1px solid #1d2126' }}
    >
      <p
        className="px-4 pb-3 text-[0.6rem] font-semibold tracking-[0.15em] uppercase"
        style={{ color: '#56687a' }}
      >
        Settings
      </p>
      {SECTIONS.map((s) => {
        const isActive = s.id === activeSection
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className="flex items-center gap-2.5 mx-2 px-3 py-2 rounded text-left text-[0.8125rem] font-medium transition-colors"
            style={{
              background: isActive ? 'rgba(168,232,255,0.08)' : 'transparent',
              color: isActive ? '#a8e8ff' : '#8a9bb0',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <span style={{ color: isActive ? '#a8e8ff' : '#56687a' }}>{s.icon}</span>
            {s.label}
          </button>
        )
      })}
    </nav>
  )
}
