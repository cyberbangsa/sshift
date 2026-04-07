import { useEffect } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
  message: string
  type: ToastType
  onDismiss: () => void
}

const typeClasses: Record<ToastType, string> = {
  success: 'border-accent-success bg-accent-success/10 text-accent-success',
  error: 'border-accent-danger bg-accent-danger/10 text-accent-danger',
  info: 'border-accent-primary bg-accent-primary/10 text-accent-primary',
}

export function Toast({ message, type, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg ${typeClasses[type]}`}
      style={{ maxWidth: '480px' }}
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-sm">{message.split('\n')[0]}</span>
        {message.includes('\n') && (
          <span
            className="text-[0.65rem] opacity-60 font-mono break-all"
          >
            {message.split('\n')[1]}
          </span>
        )}
      </span>
      <button
        onClick={onDismiss}
        className="ml-2 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M3 3L9 9M9 3L3 9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )
}
