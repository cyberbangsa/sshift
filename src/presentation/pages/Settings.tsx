import { useState } from 'react'
import { useUIStore } from '@/application/stores'
import { APP_NAME } from '@/config'
import {
  SettingsSidebar,
  AISettingsSection,
  TerminalSettingsSection,
  ConnectionSettingsSection,
} from '@/presentation/components/settings'
import type { SettingsSection } from '@/presentation/components/settings'

const SECTION_TITLES: Record<SettingsSection, string> = {
  ai: 'AI Agent',
  terminal: 'Terminal',
  connections: 'Connections',
}

export function Settings() {
  const { closeSettings } = useUIStore()
  const [activeSection, setActiveSection] = useState<SettingsSection>('ai')

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden"
      style={{ background: '#0c0e11' }}
    >
      {/* Top bar */}
      <div
        className="flex items-center h-[44px] shrink-0 px-4 gap-3"
        style={{ background: '#111317', borderBottom: '1px solid #1d2126' }}
      >
        {/* Back button */}
        <button
          onClick={closeSettings}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-[0.8125rem] transition-colors hover:bg-white/5"
          style={{ color: '#8a9bb0', fontFamily: "'Inter', sans-serif" }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>

        <span style={{ color: '#1d2126' }}>│</span>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5">
          <span
            className="font-mono text-[0.6rem] font-bold px-1 py-0.5 rounded"
            style={{ background: 'linear-gradient(135deg, #a8e8ff, #00d4ff)', color: '#0c0e11' }}
          >
            &gt;_
          </span>
          <span
            className="text-sm font-bold tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#e2e2e6' }}
          >
            {APP_NAME}
          </span>
          <span style={{ color: '#56687a', fontSize: '0.75rem' }}>/ Settings</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Left sidebar */}
        <div style={{ background: '#111317' }}>
          <SettingsSidebar activeSection={activeSection} onSelect={setActiveSection} />
        </div>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto px-10 py-8">
          <h2
            className="text-xl font-semibold mb-6"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#e2e2e6' }}
          >
            {SECTION_TITLES[activeSection]}
          </h2>

          {activeSection === 'ai' && <AISettingsSection />}
          {activeSection === 'terminal' && <TerminalSettingsSection />}
          {activeSection === 'connections' && <ConnectionSettingsSection />}
        </main>
      </div>
    </div>
  )
}
