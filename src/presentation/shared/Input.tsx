import type { InputHTMLAttributes } from 'react'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string
  error?: string
  onChange: (value: string) => void
}

export function Input({
  label,
  error,
  onChange,
  className = '',
  disabled,
  ...props
}: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm text-text-secondary font-medium">{label}</label>
      )}
      <input
        className={`rounded bg-surface-tertiary border border-border-default px-3 py-1.5 text-sm
          text-text-primary placeholder:text-text-muted
          focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-accent-danger' : ''} ${className}`}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
      {error && <span className="text-xs text-accent-danger">{error}</span>}
    </div>
  )
}
