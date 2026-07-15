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
  compareMode: boolean
  busy: boolean
  previewOverride: Pixels | null
  current: () => Pixels | null
  load: (p: Pixels) => void
  loadWithHistory: (original: Pixels, current: Pixels) => void
  commit: (next: Pixels) => void
  undo: () => void
  redo: () => void
  resetToOriginal: () => void
  setTool: (t: ToolId) => void
  setCompareMode: (v: boolean) => void
  setBusy: (v: boolean) => void
  setPreviewOverride: (p: Pixels | null) => void
}

export const useEditor = create<EditorState>((set, get) => ({
  original: null,
  history: null,
  activeTool: 'adjust',
  compareMode: false,
  busy: false,
  previewOverride: null,
  current: () => get().history?.present ?? null,
  load: (p) => set({ original: p, history: initHistory(p), previewOverride: null }),
  loadWithHistory: (original, current) =>
    set({ original, history: initHistory(current), previewOverride: null }),
  commit: (next) =>
    set((s) => (s.history ? { history: pushHistory(s.history, next) } : {})),
  undo: () => set((s) => (s.history ? { history: undoH(s.history) } : {})),
  redo: () => set((s) => (s.history ? { history: redoH(s.history) } : {})),
  resetToOriginal: () =>
    set((s) => (s.original ? { history: initHistory(s.original) } : {})),
  setTool: (t) => set({ activeTool: t }),
  setCompareMode: (v) => set({ compareMode: v }),
  setBusy: (v) => set({ busy: v }),
  setPreviewOverride: (p) => set({ previewOverride: p }),
}))
