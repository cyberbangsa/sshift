import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'
import { AppLayout } from '@/presentation/layouts'
import { Dashboard } from '@/presentation/pages/Dashboard'
import { ActiveSession } from '@/presentation/pages/ActiveSession'
import { useSessionStore } from '@/application/stores'

function AppContent() {
  const { sessions, activeSessionId } = useSessionStore()
  const sessionList = Array.from(sessions.values())

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Dashboard — always mounted, shown when no session is active */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          visibility: activeSessionId === null ? 'visible' : 'hidden',
          pointerEvents: activeSessionId === null ? 'auto' : 'none',
          zIndex: activeSessionId === null ? 1 : 0,
        }}
      >
        <RouterProvider router={router} defaultComponent={Dashboard} />
      </div>

      {/* Sessions — all kept mounted so terminals preserve history */}
      {sessionList.map((session) => {
        const isActive = activeSessionId === session.id
        return (
          <div
            key={session.id}
            style={{
              position: 'absolute',
              inset: 0,
              visibility: isActive ? 'visible' : 'hidden',
              pointerEvents: isActive ? 'auto' : 'none',
              zIndex: isActive ? 1 : 0,
            }}
          >
            <ActiveSession sessionId={session.id} />
          </div>
        )
      })}
    </div>
  )
}

export default function App() {
  return (
    <AppLayout>
      <AppContent />
    </AppLayout>
  )
}

export { Dashboard, ActiveSession }
