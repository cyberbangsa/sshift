interface ActionChipsProps {
  onAction: (command: string) => void
}

const quickActions = [
  { label: 'Run with sudo', command: 'Run the previous command with sudo' },
  { label: 'Check ownership', command: 'Check the file ownership and permissions' },
  { label: 'Explain error in detail', command: 'Explain this error in detail and suggest fixes' },
]

export function ActionChips({ onAction }: ActionChipsProps) {
  return (
    <div className="flex flex-col gap-1.5 px-3 py-2 shrink-0">
      {quickActions.map((action) => (
        <button
          key={action.label}
          onClick={() => onAction(action.command)}
          className="w-full text-left px-3 py-2 rounded text-[0.6875rem] font-medium transition-colors"
          style={{
            fontFamily: "'Inter', sans-serif",
            color: '#8a9bb0',
            background: 'transparent',
            border: '1px solid #1d2126',
            letterSpacing: '0.01em',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color = '#a8e8ff'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(168,232,255,0.3)'
            ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(168,232,255,0.04)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color = '#8a9bb0'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#1d2126'
            ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}
