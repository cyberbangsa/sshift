import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TerminalPane } from './TerminalPane'

// Mock xterm.js since it requires a real DOM with canvas
vi.mock('@xterm/xterm', () => {
  const Terminal = vi.fn(function (this: Record<string, unknown>) {
    this.loadAddon = vi.fn()
    this.open = vi.fn()
    this.onData = vi.fn()
    this.write = vi.fn()
    this.clear = vi.fn()
    this.focus = vi.fn()
    this.dispose = vi.fn()
  })
  return { Terminal }
})

vi.mock('@xterm/addon-fit', () => {
  const FitAddon = vi.fn(function (this: Record<string, unknown>) {
    this.fit = vi.fn()
    this.dispose = vi.fn()
  })
  return { FitAddon }
})

vi.mock('@xterm/addon-web-links', () => {
  const WebLinksAddon = vi.fn(function (this: Record<string, unknown>) {
    this.dispose = vi.fn()
  })
  return { WebLinksAddon }
})

describe('TerminalPane', () => {
  it('should render a terminal container', () => {
    render(<TerminalPane sessionId="test-session" onData={vi.fn()} />)

    expect(screen.getByTestId('terminal-container')).toBeInTheDocument()
  })

  it('should mount xterm Terminal on render', async () => {
    const { Terminal } = await import('@xterm/xterm')

    render(<TerminalPane sessionId="test-session" onData={vi.fn()} />)

    expect(Terminal).toHaveBeenCalled()
  })
})
