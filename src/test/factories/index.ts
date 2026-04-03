import type { Host, Session, FileEntry, Transfer, AIMessage } from '@/domain/entities'

let counter = 0
function nextId(): string {
  counter++
  return `test-id-${counter}`
}

export function createHost(overrides: Partial<Host> = {}): Host {
  return {
    id: nextId(),
    label: 'Test Server',
    hostname: '192.168.1.1',
    port: 22,
    username: 'testuser',
    authMethod: 'password',
    tags: ['test'],
    createdAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  }
}

export function createSession(overrides: Partial<Session> = {}): Session {
  return {
    id: nextId(),
    hostId: nextId(),
    status: 'connected',
    connectedAt: new Date('2025-01-01T00:00:00Z'),
    latencyMs: 25,
    currentPath: '/home/testuser',
    ...overrides,
  }
}

export function createFileEntry(overrides: Partial<FileEntry> = {}): FileEntry {
  return {
    name: 'test-file.txt',
    path: '/home/testuser/test-file.txt',
    type: 'file',
    size: 1024,
    permissions: '-rw-r--r--',
    modifiedAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  }
}

export function createTransfer(overrides: Partial<Transfer> = {}): Transfer {
  return {
    id: nextId(),
    sessionId: nextId(),
    sourcePath: '/local/file.txt',
    destinationPath: '/remote/file.txt',
    direction: 'upload',
    status: 'pending',
    progress: 0,
    bytesPerSecond: 0,
    ...overrides,
  }
}

export function createAIMessage(overrides: Partial<AIMessage> = {}): AIMessage {
  return {
    id: nextId(),
    role: 'user',
    content: 'Test message',
    timestamp: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  }
}

export function resetFactoryCounter(): void {
  counter = 0
}
