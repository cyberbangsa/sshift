import {
  createRouter,
  createRootRoute,
  createRoute,
} from '@tanstack/react-router'

const rootRoute = createRootRoute()

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
})

const sessionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/session/$sessionId',
})

const routeTree = rootRoute.addChildren([indexRoute, sessionRoute])

export const router = createRouter({ routeTree })

export { indexRoute, sessionRoute }

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
