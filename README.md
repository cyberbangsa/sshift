<p align="center">
  <img src="src-tauri/icons/128x128.png" alt="SSHift" width="100" />
</p>

<h1 align="center">SSHift</h1>
<p align="center"><strong>SSH Management with AI</strong></p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-64ffda?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/license-MIT-64ffda?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/macOS-0d1b2a?style=flat-square&logo=apple&logoColor=64ffda" alt="macOS" />
  <img src="https://img.shields.io/badge/Windows-0d1b2a?style=flat-square&logo=windows&logoColor=64ffda" alt="Windows" />
  <img src="https://img.shields.io/badge/Linux-0d1b2a?style=flat-square&logo=linux&logoColor=64ffda" alt="Linux" />
  <img src="https://img.shields.io/badge/Tauri-2-0d1b2a?style=flat-square&logo=tauri&logoColor=64ffda" alt="Tauri" />
  <img src="https://img.shields.io/badge/React-19-0d1b2a?style=flat-square&logo=react&logoColor=64ffda" alt="React" />
</p>

---

SSHift is a secure, AI-powered SSH client built with [Tauri](https://tauri.app) and React. It combines a full interactive terminal, a remote file explorer over SFTP, and an embedded AI agent — all in a single native desktop application. API keys are stored securely in the OS keychain and never leave your machine unencrypted.

---

## Features

### SSH Host Management

- Save and organise hosts with label, hostname, port, username, tags, and auth method (password or private-key path)
- Quick Connect bar — connect instantly with `user@host:port` syntax without saving a host
- Per-host **AI Rules** — custom instructions injected into the AI agent's context for that server
- Visual connection status badges

### Interactive Terminal

- Full PTY over SSH rendered with [xterm.js](https://xtermjs.org)
- Real-time resize sync between the UI and the remote PTY
- Configurable font family and size (default: JetBrains Mono, 14 px)
- Clickable URLs via web-links add-on

### Remote File Explorer (SFTP)

- Browse remote and local directories side by side
- Displays file type, size, permissions, and modification time
- Upload and download files with live progress tracking
- Transfer queue with up to 3 concurrent transfers

### Shift AI Agent

- Embedded AI assistant panel per active session, with full awareness of the current host's AI rules
- **Manual mode** — AI suggests shell commands; you review and click Run
- **Auto mode** — commands execute automatically; their output is fed back into the agent for chained, agentic task completion (up to 5 iterations)
- `<readfile>/path</readfile>` tag — agent can request remote file contents directly over SFTP
- Streaming responses with an abort/stop control at any time

### Secure Settings

- API keys stored in the native OS keychain (Apple Keychain / Windows Credential Manager / Linux Secret Service)
- Configurable AI model, system prompt, max tokens, and conversation history length
- Terminal font and size preferences
- Default SSH port and default remote path for new connections

---

## Tech Stack

### Frontend

| Library                  | Purpose                       |
| ------------------------ | ----------------------------- |
| React 19                 | UI framework                  |
| TypeScript 5             | Type safety                   |
| Vite 8                   | Build tool & dev server       |
| TailwindCSS 4            | Utility-first styling         |
| TanStack Router          | Type-safe client-side routing |
| Zustand 5                | Global state management       |
| xterm.js 6               | Terminal emulator             |
| react-syntax-highlighter | Code highlighting in AI chat  |

### Backend (Tauri / Rust)

| Crate              | Purpose                                        |
| ------------------ | ---------------------------------------------- |
| tauri 2            | Desktop app framework — IPC, events, windowing |
| ssh2               | SSH connections and SFTP operations            |
| tokio              | Async runtime                                  |
| keyring 3          | OS keychain integration                        |
| serde / serde_json | Serialization                                  |
| thiserror          | Structured error types                         |

---

## Prerequisites

- **Node.js** — latest LTS
- **Rust** ≥ 1.77.2 — install via [rustup.rs](https://rustup.rs)
- **Tauri system dependencies** — follow the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/) for your OS (macOS, Windows, and Linux are all supported)
- **OpenRouter API key** — obtain one at [openrouter.ai](https://openrouter.ai) and add it in the Settings page

---

## Getting Started

```bash
# Clone the repository
git clone https://github.com/cyberbangsa/sshift.git
cd sshift

# Install Node.js dependencies
npm install

# Start the app in development mode (Vite + Tauri)
npm run app
```

---

## Available Scripts

| Script                  | Description                                      |
| ----------------------- | ------------------------------------------------ |
| `npm run dev`           | Start the Vite dev server only (no Tauri window) |
| `npm run app`           | Launch the full Tauri app in development mode    |
| `npm run build`         | Type-check and build the frontend for production |
| `npm run tauri build`   | Build the native application bundle              |
| `npm run lint`          | Run ESLint across the source                     |
| `npm run format`        | Format source files with Prettier                |
| `npm run test`          | Run all unit tests with Vitest                   |
| `npm run test:watch`    | Run tests in interactive watch mode              |
| `npm run test:coverage` | Generate a test coverage report                  |

---

## Architecture

SSHift follows a **Clean Architecture** approach with strict layer separation:

```
domain/           Pure entities, use-case logic, and repository interfaces
infrastructure/   Tauri IPC implementations, AI API clients, local storage
application/      React hooks and Zustand stores that orchestrate use cases
presentation/     Pages, layouts, and UI components
```

This boundary keeps business logic (SSH connection, AI messaging, file transfer) fully decoupled from the UI and the Tauri runtime, making each layer independently testable.

---

## Configuration

All configuration is managed through the **Settings** page within the app:

- **AI Provider** — OpenRouter (routes to 200+ models)
- **Model** — any model slug supported by your provider (default: `openai/gpt-4o`)
- **API Key** — stored in the OS keychain; never written to disk in plain text
- **System Prompt** — global instructions for the AI agent
- **Per-host AI Rules** — additional constraints injected per server connection

---

## License

MIT © [Cyber Bangsa](https://github.com/cyberbangsa)
