import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

/** True when running inside the Tauri desktop webview. */
const isTauri =
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

interface TerminalPaneProps {
  sessionId: string
}

export interface TerminalPaneHandle {
  write: (data: string | Uint8Array) => void
  clear: () => void
  focus: () => void
}

export const TerminalPane = forwardRef<TerminalPaneHandle, TerminalPaneProps>(
  function TerminalPane({ sessionId }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const terminalRef  = useRef<Terminal | null>(null)
    const fitAddonRef  = useRef<FitAddon | null>(null)

    useImperativeHandle(ref, () => ({
      write: (data) => terminalRef.current?.write(data),
      clear: () => terminalRef.current?.clear(),
      focus: () => terminalRef.current?.focus(),
    }))

    useEffect(() => {
      if (!containerRef.current) return

      const terminal = new Terminal({
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
        theme: {
          background:          '#0c0e11',
          foreground:          '#e2e2e6',
          cursor:              '#a8e8ff',
          cursorAccent:        '#0c0e11',
          selectionBackground: '#a8e8ff33',
          black:   '#1d2126', red:     '#ff6b6b',
          green:   '#22c55e', yellow:  '#f59e0b',
          blue:    '#60a5fa', magenta: '#a855f7',
          cyan:    '#a8e8ff', white:   '#e2e2e6',
          brightBlack:   '#3c494e', brightRed:     '#ff8a8a',
          brightGreen:   '#4ade80', brightYellow:  '#fbbf24',
          brightBlue:    '#93c5fd', brightMagenta: '#c084fc',
          brightCyan:    '#00d4ff', brightWhite:   '#ffffff',
        },
        cursorBlink: true,
        cursorStyle: 'block',
        scrollback: 10000,
        allowTransparency: false,
        convertEol: false,
      })

      const fitAddon   = new FitAddon()
      const linksAddon = new WebLinksAddon()
      terminal.loadAddon(fitAddon)
      terminal.loadAddon(linksAddon)
      terminal.open(containerRef.current)

      requestAnimationFrame(() => { fitAddon.fit(); terminal.focus() })

      terminalRef.current = terminal
      fitAddonRef.current = fitAddon

      // ── Tauri bridge ─────────────────────────────────────────────────────
      let unlistenOutput: (() => void) | undefined
      let unlistenClosed: (() => void) | undefined
      let active = true

      if (isTauri) {
        // Keyboard → PTY stdin
        terminal.onData((data) => {
          const bytes = Array.from(new TextEncoder().encode(data))
          import('@tauri-apps/api/core').then(({ invoke }) =>
            invoke('write_to_pty', { sessionId, data: bytes }).catch(console.error)
          )
        })

        // PTY stdout → terminal  (Rust emits Vec<u8> which arrives as number[])
        import('@tauri-apps/api/event').then(({ listen }) => {
          if (!active) return

          listen<number[]>('terminal-output:' + sessionId, (e) =>
            terminal.write(new Uint8Array(e.payload))
          ).then((fn) => { unlistenOutput = fn })

          listen<string>('terminal-closed:' + sessionId, (e) =>
            terminal.write('\r\n\x1b[33m[' + (e.payload || 'Session ended') + ']\x1b[0m\r\n')
          ).then((fn) => { unlistenClosed = fn })
        })
      } else {
        // Browser dev-mode: local echo for UI testing
        terminal.write('\x1b[36mSSH terminal\x1b[0m \u2014 browser dev mode.\r\n')
        terminal.write('Run \x1b[32mnpm run tauri dev\x1b[0m for a live SSH connection.\r\n\r\n$ ')
        terminal.onData((d) => {
          if (d === '\r')      terminal.write('\r\n$ ')
          else if (d === '\x7f') terminal.write('\b \b')
          else                   terminal.write(d)
        })
      }

      // ── Resize observer ───────────────────────────────────────────────────
      const ro = new ResizeObserver(() => {
        fitAddon.fit()
        if (isTauri) {
          const dims = fitAddon.proposeDimensions()
          if (dims)
            import('@tauri-apps/api/core').then(({ invoke }) =>
              invoke('resize_pty', { sessionId, cols: dims.cols, rows: dims.rows }).catch(() => {})
            )
        }
      })
      ro.observe(containerRef.current)

      return () => {
        active = false
        unlistenOutput?.()
        unlistenClosed?.()
        ro.disconnect()
        terminal.dispose()
        terminalRef.current = null
        fitAddonRef.current = null
      }
    }, [sessionId])

    return (
      <div
        ref={containerRef}
        className="w-full h-full min-h-0"
        style={{ padding: '6px 8px', boxSizing: 'border-box' }}
        data-testid="terminal-container"
      />
    )
  },
)
