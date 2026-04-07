import type { Host, Session, FileEntry, Transfer } from '@/domain/entities'
import type { IHostRepository } from '@/domain/repositories/IHostRepository'
import type { ISessionRepository } from '@/domain/repositories/ISessionRepository'
import type { IFileRepository } from '@/domain/repositories/IFileRepository'
import type { IAIClient } from '@/domain/usecases/SendAIMessage'
import { createSession, createTransfer, createFileEntry } from '@/test/factories'

export class MockHostRepository implements IHostRepository {
  private hosts: Host[] = []

  constructor(initialHosts: Host[] = []) {
    this.hosts = [...initialHosts]
  }

  async getAll(): Promise<Host[]> {
    return [...this.hosts]
  }

  async getById(id: string): Promise<Host | null> {
    return this.hosts.find((h) => h.id === id) ?? null
  }

  async save(host: Host): Promise<void> {
    const index = this.hosts.findIndex((h) => h.id === host.id)
    if (index >= 0) {
      this.hosts[index] = host
    } else {
      this.hosts.push(host)
    }
  }

  async delete(id: string): Promise<void> {
    this.hosts = this.hosts.filter((h) => h.id !== id)
  }
}

interface MockSessionRepositoryOptions {
  shouldFail?: boolean
  failMessage?: string
}

export class MockSessionRepository implements ISessionRepository {
  private sessions: Session[] = []
  private shouldFail: boolean
  private failMessage: string

  constructor(options: MockSessionRepositoryOptions = {}) {
    this.shouldFail = options.shouldFail ?? false
    this.failMessage = options.failMessage ?? 'Connection refused'
  }

  async connect(host: Host): Promise<Session> {
    if (this.shouldFail) {
      throw new Error(this.failMessage)
    }
    const session = createSession({
      hostId: host.id,
      status: 'connected',
      connectedAt: new Date(),
    })
    this.sessions.push(session)
    return session
  }

  async disconnect(sessionId: string): Promise<void> {
    this.sessions = this.sessions.filter((s) => s.id !== sessionId)
  }

  async executeCommand(_sessionId: string, _command: string): Promise<string> {
    if (this.shouldFail) {
      throw new Error('Command execution failed')
    }
    return 'mock command output'
  }

  getActiveSessions(): Session[] {
    return [...this.sessions]
  }
}

interface MockFileRepositoryOptions {
  shouldFail?: boolean
  entries?: FileEntry[]
}

export class MockFileRepository implements IFileRepository {
  private shouldFail: boolean
  private entries: FileEntry[]

  constructor(options: MockFileRepositoryOptions = {}) {
    this.shouldFail = options.shouldFail ?? false
    this.entries = options.entries ?? [
      createFileEntry({ name: 'documents', path: '/documents', type: 'directory' }),
      createFileEntry({ name: 'readme.md', path: '/readme.md', type: 'file' }),
    ]
  }

  async listDirectory(_sessionId: string, _path: string): Promise<FileEntry[]> {
    if (this.shouldFail) throw new Error('Failed to list directory')
    return [...this.entries]
  }

  async uploadFile(sessionId: string, localPath: string, remotePath: string): Promise<Transfer> {
    if (this.shouldFail) throw new Error('Upload failed')
    return createTransfer({
      sessionId,
      sourcePath: localPath,
      destinationPath: remotePath,
      direction: 'upload',
      status: 'active',
    })
  }

  async downloadFile(sessionId: string, remotePath: string, localPath: string): Promise<Transfer> {
    if (this.shouldFail) throw new Error('Download failed')
    return createTransfer({
      sessionId,
      sourcePath: remotePath,
      destinationPath: localPath,
      direction: 'download',
      status: 'active',
    })
  }

  async deleteFile(_sessionId: string, _path: string): Promise<void> {
    if (this.shouldFail) throw new Error('Delete failed')
  }

  async renameFile(_sessionId: string, _oldPath: string, _newPath: string): Promise<void> {
    if (this.shouldFail) throw new Error('Rename failed')
  }
}

interface MockAIClientOptions {
  shouldFail?: boolean
  response?: string
}

export class MockAIClient implements IAIClient {
  private shouldFail: boolean
  private response: string
  public lastMessages: unknown[] = []

  constructor(options: MockAIClientOptions = {}) {
    this.shouldFail = options.shouldFail ?? false
    this.response = options.response ?? 'This is a mock AI response.'
  }

  async sendMessage(messages: unknown[], _userMessage: string): Promise<string> {
    this.lastMessages = messages
    if (this.shouldFail) throw new Error('AI service unavailable')
    return this.response
  }
}
