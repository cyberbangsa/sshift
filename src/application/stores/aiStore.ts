import { create } from 'zustand'
import type { AIMessage } from '@/domain/entities'

interface AIState {
  messages: AIMessage[]
  isStreaming: boolean
  error: string | null
}

interface AIActions {
  addMessage: (message: AIMessage) => void
  setStreaming: (streaming: boolean) => void
  setError: (error: string | null) => void
  clearMessages: () => void
}

export type AIStore = AIState & AIActions

export const useAIStore = create<AIStore>((set) => ({
  messages: [],
  isStreaming: false,
  error: null,
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setStreaming: (isStreaming) => set({ isStreaming }),
  setError: (error) => set({ error }),
  clearMessages: () => set({ messages: [], error: null }),
}))
