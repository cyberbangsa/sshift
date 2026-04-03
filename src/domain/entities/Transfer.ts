export interface Transfer {
  id: string
  sessionId: string
  sourcePath: string
  destinationPath: string
  direction: 'upload' | 'download'
  status: 'pending' | 'active' | 'complete' | 'failed'
  progress: number
  bytesPerSecond: number
}
