import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-br from-accent-primary to-accent-cyan-dark text-[#0c0e11] font-semibold hover:opacity-90',
  secondary: 'bg-surface-high text-text-primary hover:bg-surface-high/80',
  danger: 'bg-accent-danger text-white hover:bg-accent-danger/90',
  ghost: 'bg-transparent text-text-secondary hover:bg-surface-high/60',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded font-medium transition-colors
        focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-1
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      style={variant === 'primary' ? { borderRadius: '4px' } : undefined}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
