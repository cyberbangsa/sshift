import { describe, it, expect, beforeEach } from 'vitest'
import { TransferFile, TransferError } from './TransferFile'
import { MockFileRepository } from '@/test/mocks'

describe('TransferFile', () => {
  let repository: MockFileRepository
  let useCase: TransferFile

  beforeEach(() => {
    repository = new MockFileRepository()
    useCase = new TransferFile(repository)
  })

  it('should initiate an upload transfer', async () => {
    const transfer = await useCase.execute(
      'session-1',
      '/local/file.txt',
      '/remote/file.txt',
      'upload',
    )

    expect(transfer.direction).toBe('upload')
    expect(transfer.sourcePath).toBe('/local/file.txt')
    expect(transfer.destinationPath).toBe('/remote/file.txt')
    expect(transfer.status).toBe('active')
  })

  it('should initiate a download transfer', async () => {
    const transfer = await useCase.execute(
      'session-1',
      '/remote/file.txt',
      '/local/file.txt',
      'download',
    )

    expect(transfer.direction).toBe('download')
    expect(transfer.sourcePath).toBe('/remote/file.txt')
    expect(transfer.destinationPath).toBe('/local/file.txt')
  })

  it('should throw TransferError when source path is empty', async () => {
    await expect(useCase.execute('session-1', '', '/remote/file.txt', 'upload')).rejects.toThrow(
      TransferError,
    )
    await expect(useCase.execute('session-1', '', '/remote/file.txt', 'upload')).rejects.toThrow(
      'Source and destination paths are required',
    )
  })

  it('should throw TransferError when destination path is empty', async () => {
    await expect(useCase.execute('session-1', '/local/file.txt', '', 'upload')).rejects.toThrow(
      TransferError,
    )
  })

  it('should throw TransferError when repository fails', async () => {
    repository = new MockFileRepository({ shouldFail: true })
    useCase = new TransferFile(repository)

    await expect(
      useCase.execute('session-1', '/local/file.txt', '/remote/file.txt', 'upload'),
    ).rejects.toThrow(TransferError)
  })

  it('should include sessionId in TransferError', async () => {
    repository = new MockFileRepository({ shouldFail: true })
    useCase = new TransferFile(repository)

    try {
      await useCase.execute('session-42', '/a', '/b', 'upload')
      expect.fail('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(TransferError)
      expect((error as TransferError).sessionId).toBe('session-42')
    }
  })
})
