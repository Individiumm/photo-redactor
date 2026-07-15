import { create } from 'zustand'
import { Pixels } from '../core/pixels'
import {
  History, initHistory, pushHistory, undo as undoH, redo as redoH,
} from '../core/history'

export type ToolId = 'adjust' | 'filters' | 'background' | 'heal' | 'transform'

interface EditorState {
  original: Pixels | null
  history: History<Pixels> | null
  activeTool: ToolId
  showBefore: boolean
  busy: boolean
  current: () => Pixels | null
  load: (p: Pixels) => void
  commit: (next: Pixels) => void
  undo: () => void
  redo: () => void
  resetToOriginal: () => void
  setTool: (t: ToolId) => void
  setShowBefore: (v: boolean) => void
  setBusy: (v: boolean) => void
}

export const useEditor = create<EditorState>((set, get) => ({
  original: null,
  history: null,
  activeTool: 'adjust',
  showBefore: false,
  busy: false,
  current: () => get().history?.present ?? null,
  load: (p) => set({ original: p, history: initHistory(p) }),
  commit: (next) =>
    set((s) => (s.history ? { history: pushHistory(s.history, next) } : {})),
  undo: () => set((s) => (s.history ? { history: undoH(s.history) } : {})),
  redo: () => set((s) => (s.history ? { history: redoH(s.history) } : {})),
  resetToOriginal: () =>
    set((s) => (s.original ? { history: initHistory(s.original) } : {})),
  setTool: (t) => set({ activeTool: t }),
  setShowBefore: (v) => set({ showBefore: v }),
  setBusy: (v) => set({ busy: v }),
}))
