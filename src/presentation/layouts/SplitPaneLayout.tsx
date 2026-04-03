import { type ReactNode, useCallback, useRef, useState } from 'react'

interface SplitPaneLayoutProps {
  left: ReactNode
  right: ReactNode
  initialLeftWidth?: number
  minLeftWidth?: number
  minRightWidth?: number
}

export function SplitPaneLayout({
  left,
  right,
  initialLeftWidth = 300,
  minLeftWidth = 200,
  minRightWidth = 200,
}: SplitPaneLayoutProps) {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const handleMouseDown = useCallback(() => {
    isDragging.current = true

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const newWidth = e.clientX - rect.left
      const maxWidth = rect.width - minRightWidth
      setLeftWidth(Math.max(minLeftWidth, Math.min(newWidth, maxWidth)))
    }

    const handleMouseUp = () => {
      isDragging.current = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [minLeftWidth, minRightWidth])

  return (
    <div ref={containerRef} className="flex h-full w-full">
      <div style={{ width: leftWidth }} className="shrink-0 overflow-hidden">
        {left}
      </div>
      <div
        className="w-1 cursor-col-resize bg-border-default hover:bg-border-focus transition-colors shrink-0"
        onMouseDown={handleMouseDown}
        role="separator"
      />
      <div className="flex-1 min-w-0 overflow-hidden">{right}</div>
    </div>
  )
}
