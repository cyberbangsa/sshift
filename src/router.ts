import { createRouter, createRootRoute, createRoute } from '@tanstack/react-router'
import { Settings } from '@/presentation/pages'

const rootRoute = createRootRoute()

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
})

const sessionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/session/$sessionId',
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: Settings,
})

const routeTree = rootRoute.addChildren([indexRoute, sessionRoute, settingsRoute])

export const router = createRouter({ routeTree })

export { indexRoute, sessionRoute, settingsRoute }

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
