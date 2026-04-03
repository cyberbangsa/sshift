import { create } from 'zustand'

interface UIState {
  sidebarWidth: number
  explorerWidth: number
  aiPanelWidth: number
  isSidebarCollapsed: boolean
  isExplorerVisible: boolean
  isAIPanelVisible: boolean
  activeTab: 'terminal' | 'explorer' | 'transfers'
}

interface UIActions {
  setSidebarWidth: (width: number) => void
  setExplorerWidth: (width: number) => void
  setAIPanelWidth: (width: number) => void
  toggleSidebar: () => void
  toggleExplorer: () => void
  toggleAIPanel: () => void
  setActiveTab: (tab: UIState['activeTab']) => void
}

export type UIStore = UIState & UIActions

export const useUIStore = create<UIStore>((set) => ({
  sidebarWidth: 260,
  explorerWidth: 300,
  aiPanelWidth: 360,
  isSidebarCollapsed: false,
  isExplorerVisible: true,
  isAIPanelVisible: false,
  activeTab: 'terminal',
  setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
  setExplorerWidth: (explorerWidth) => set({ explorerWidth }),
  setAIPanelWidth: (aiPanelWidth) => set({ aiPanelWidth }),
  toggleSidebar: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  toggleExplorer: () =>
    set((state) => ({ isExplorerVisible: !state.isExplorerVisible })),
  toggleAIPanel: () =>
    set((state) => ({ isAIPanelVisible: !state.isAIPanelVisible })),
  setActiveTab: (activeTab) => set({ activeTab }),
}))
