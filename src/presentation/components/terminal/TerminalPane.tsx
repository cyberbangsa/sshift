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
  onClosed?: (exitCode: number) => void
}

export interface TerminalPaneHandle {
  write: (data: string | Uint8Array) => void
  clear: () => void
  focus: () => void
  /** Send raw input to the SSH PTY (actually executes commands). */
  sendInput: (data: string) => void
  /** Collect PTY output for up to timeoutMs ms, stopping early when a shell
   *  prompt is detected. Returns ANSI-stripped text. */
  captureOutput: (timeoutMs?: number) => Promise<string>
}

export const TerminalPane = forwardRef<TerminalPaneHandle, TerminalPaneProps>(
  function TerminalPane({ sessionId, onClosed }, ref) {
    const containerRef  = useRef<HTMLDivElement>(null)
    const terminalRef   = useRef<Terminal | null>(null)
    const fitAddonRef   = useRef<FitAddon | null>(null)
    const onClosedRef   = useRef(onClosed)
    onClosedRef.current = onClosed

    useImperativeHandle(ref, () => ({
      write: (data) => terminalRef.current?.write(data),
      clear: () => terminalRef.current?.clear(),
      focus: () => terminalRef.current?.focus(),

      sendInput: (data) => {
        if (!isTauri) {
          // Dev mode: echo locally
          terminalRef.current?.write(data)
          return
        }
        const bytes = Array.from(new TextEncoder().encode(data))
        import('@tauri-apps/api/core').then(({ invoke }) =>
          invoke('write_to_pty', { sessionId, data: bytes }).catch(console.error)
        )
      },

      captureOutput: (timeoutMs = 6000) =>
        new Promise<string>((resolve) => {
          if (!isTauri) { resolve(''); return }
          // Strip ANSI escape sequences from collected output
          // eslint-disable-next-line no-control-regex
          const ANSI_RE = /\x1b(?:[@-Z\\-_]|\[[0-9;]*[ -/]*[@-~]|\].*?(?:\x07|\x1b\\))/g
          // Shell prompt pattern — $, #, %, > (possibly coloured), followed by optional space
          const PROMPT_RE = /[$#%>]\s*$/
          let buffer = ''
          let unlisten: (() => void) | undefined
          let finished = false

          const finish = () => {
            if (finished) return
            finished = true
            clearTimeout(timer)
            unlisten?.()
            resolve(buffer.replace(ANSI_RE, '').trim())
          }

          const timer = setTimeout(finish, timeoutMs)

          import('@tauri-apps/api/event').then(({ listen }) => {
            listen<number[]>('terminal-output:' + sessionId, (e) => {
              const chunk = new TextDecoder().decode(new Uint8Array(e.payload))
              buffer += chunk
              // Stop early once we detect a shell prompt
              if (PROMPT_RE.test(buffer.replace(ANSI_RE, ''))) {
                setTimeout(finish, 80) // short tail to catch any remaining chars
              }
            }).then((fn) => { unlisten = fn })
          })
        }),
    }), [sessionId])

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

          listen<number>('terminal-closed:' + sessionId, (e) => {
            const exitCode = typeof e.payload === 'number' ? e.payload : -1
            if (exitCode === 0) {
              terminal.write('\r\n\x1b[33m[Session ended]\x1b[0m\r\n')
            } else {
              terminal.write('\r\n\x1b[31m[Connection lost — exit code ' + exitCode + ']\x1b[0m\r\n')
            }
            onClosedRef.current?.(exitCode)
          }).then((fn) => { unlistenClosed = fn })
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
