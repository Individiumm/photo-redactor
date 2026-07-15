# Free Local Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four free, fully local features to the existing client-side photo editor: a draggable before/after compare slider, live filter-preset thumbnails, session persistence via IndexedDB with a restore prompt, and a separate batch-processing mode that applies one filter/adjustment to many photos and downloads a ZIP.

**Architecture:** Same layering as the existing app — pure logic in `src/core/**`/`src/modules/*` (Node-testable where DOM-free), browser-only orchestration in `src/modules/*` (untested by unit tests, verified via `tsc`/build/manual browser QA), React components in `src/components/*` reading/writing the single zustand store. This plan extends the store (`compareMode` replaces `showBefore`; adds `previewOverride`-adjacent `loadWithHistory`) and adds one new browser API surface (IndexedDB, wrapped in `src/modules/persistence.ts`) and one new dependency (`jszip`, for client-side ZIP assembly — no server, no API key).

**Tech Stack:** Existing stack (Vite + React 18 + TypeScript + Tailwind + zustand + Vitest) plus `jszip` (MIT, pure JS, runs entirely in the browser) and the browser's native `indexedDB` API.

## Global Constraints

- Node.js >= 18. TypeScript strict mode.
- Build verification for every task: `npx tsc -b` must pass with zero errors.
- `src/core/**` (except `canvas.ts`) and pure files under `src/modules/*` stay DOM-free and Node-testable. Browser-only code (IndexedDB, canvas, File/Blob) lives in `src/modules/*` or `src/core/canvas.ts`, is not unit-tested for real behavior, and is verified via `tsc` + manual browser QA — this matches the existing project convention (see `src/modules/background.ts`, `src/modules/heal.ts`).
- All UI text stays in Russian.
- No photo data ever leaves the browser. `jszip` and IndexedDB are both 100% client-side — this plan does not introduce any network calls beyond what already exists (`@imgly/background-removal`'s own model-weight CDN fetch).
- Follow the existing warm-minimal design system: `bg-ink`/`bg-ink-raised`/`text-paper`/`text-paper/NN`/`bg-clay`/`text-clay-strong`/`text-coral` Tailwind tokens, `rounded-sm`/`rounded-md`, hairline `border-paper/10` or `border-paper/15` borders, `transition-colors duration-150`. Do not introduce new colors or reintroduce default Tailwind palette classes (`bg-indigo-600`, `bg-neutral-800`, etc.).
- Every step with code shows the complete file content or complete diff — no partial snippets requiring guesswork.

---

## File Structure

```
src/
  modules/
    thumbnail.ts        # NEW, pure: createThumbnail(p, maxSize) -> Pixels
    persistence.ts       # NEW, browser-only: saveSession/loadSession/clearSession via IndexedDB
    batch.ts              # NEW, browser-only: processBatch(files, operation, onProgress) -> {zip, results}
  state/
    editorStore.ts        # MODIFY: replace showBefore/setShowBefore with compareMode/setCompareMode; add loadWithHistory
    persistenceSync.ts    # NEW: initPersistenceAutoSave() (debounced store subscription) + useSessionRestore() hook
  components/
    FiltersPanel.tsx      # MODIFY: render a live thumbnail per preset button
    CanvasPreview.tsx     # MODIFY: render a draggable before/after split view when compareMode is on
    Toolbar.tsx            # MODIFY: "до/после" button becomes a click-toggle for compareMode (was press-and-hold)
    RestorePrompt.tsx      # NEW: "Восстановить прошлую работу?" prompt
    BatchView.tsx           # NEW: multi-file upload + one filter/adjustment + ZIP download
  App.tsx                  # MODIFY: header mode tabs (Редактор / Пакетная обработка), restore-prompt wiring
  main.tsx                  # MODIFY: call initPersistenceAutoSave() once at startup
tests/
  modules/
    thumbnail.test.ts     # NEW
    batch.test.ts          # NEW (mocks fileToPixels/pixelsToBlob/JSZip to test orchestration logic)
```

---

## Task 1: Thumbnail core module

**Files:**
- Create: `src/modules/thumbnail.ts`
- Test: `tests/modules/thumbnail.test.ts`

**Interfaces:**
- Consumes: `Pixels` from `src/core/pixels.ts`; `resize` from `src/modules/transform.ts` (already implemented, signature `resize(p: Pixels, w: number, h: number): Pixels`).
- Produces: `createThumbnail(p: Pixels, maxSize: number): Pixels` — downscales so the longest side is at most `maxSize`, preserving aspect ratio; returns the input unchanged (same object) if it's already within `maxSize`.

- [ ] **Step 1: Write the failing test**

`tests/modules/thumbnail.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { createPixels } from '../../src/core/pixels'
import { createThumbnail } from '../../src/modules/thumbnail'

describe('createThumbnail', () => {
  it('downscales a wide image, preserving aspect ratio', () => {
    const p = createPixels(200, 100)
    const out = createThumbnail(p, 50)
    expect(out.width).toBe(50)
    expect(out.height).toBe(25)
  })

  it('downscales a tall image, preserving aspect ratio', () => {
    const p = createPixels(50, 200)
    const out = createThumbnail(p, 40)
    expect(out.height).toBe(40)
    expect(out.width).toBe(10)
  })

  it('returns the image unchanged if already within maxSize', () => {
    const p = createPixels(20, 10)
    const out = createThumbnail(p, 50)
    expect(out.width).toBe(20)
    expect(out.height).toBe(10)
  })

  it('never produces a zero-sized dimension for extreme aspect ratios', () => {
    const p = createPixels(1000, 1)
    const out = createThumbnail(p, 10)
    expect(out.width).toBe(10)
    expect(out.height).toBeGreaterThanOrEqual(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/modules/thumbnail.test.ts`
Expected: FAIL (module `thumbnail` not found).

- [ ] **Step 3: Implement**

`src/modules/thumbnail.ts`:
```ts
import { Pixels } from '../core/pixels'
import { resize } from './transform'

export function createThumbnail(p: Pixels, maxSize: number): Pixels {
  const longest = Math.max(p.width, p.height)
  if (longest <= maxSize) return p
  const scale = maxSize / longest
  const w = Math.max(1, Math.round(p.width * scale))
  const h = Math.max(1, Math.round(p.height * scale))
  return resize(p, w, h)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/modules/thumbnail.test.ts`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```bash
git add src/modules/thumbnail.ts tests/modules/thumbnail.test.ts
git commit -m "feat: add pure thumbnail downscaling module"
```

---

## Task 2: IndexedDB persistence module

**Files:**
- Create: `src/modules/persistence.ts`

**Interfaces:**
- Consumes: `Pixels` from `src/core/pixels.ts`.
- Produces:
  - `saveSession(original: Pixels, current: Pixels): Promise<void>`
  - `loadSession(): Promise<{ original: Pixels; current: Pixels } | null>`
  - `clearSession(): Promise<void>`
- Browser-only (uses `indexedDB`); not unit-tested for real behavior (same tier as `src/core/canvas.ts`). Verified via `tsc -b` plus manual browser QA in Task 4.

- [ ] **Step 1: Implement**

`src/modules/persistence.ts`:
```ts
import { Pixels } from '../core/pixels'

const DB_NAME = 'photo-editor'
const STORE_NAME = 'session'
const SESSION_KEY = 'current'
const DB_VERSION = 1

interface StoredSession {
  originalData: Uint8ClampedArray
  originalWidth: number
  originalHeight: number
  currentData: Uint8ClampedArray
  currentWidth: number
  currentHeight: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveSession(original: Pixels, current: Pixels): Promise<void> {
  const db = await openDb()
  const session: StoredSession = {
    originalData: original.data,
    originalWidth: original.width,
    originalHeight: original.height,
    currentData: current.data,
    currentWidth: current.width,
    currentHeight: current.height,
  }
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(session, SESSION_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function loadSession(): Promise<{ original: Pixels; current: Pixels } | null> {
  const db = await openDb()
  const session = await new Promise<StoredSession | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(SESSION_KEY)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  db.close()
  if (!session) return null
  return {
    original: { data: session.originalData, width: session.originalWidth, height: session.originalHeight },
    current: { data: session.currentData, width: session.currentWidth, height: session.currentHeight },
  }
}

export async function clearSession(): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(SESSION_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc -b`
Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/persistence.ts
git commit -m "feat: add IndexedDB session persistence module"
```

---

## Task 3: Store changes — compareMode and loadWithHistory

**Files:**
- Modify: `src/state/editorStore.ts`

**Interfaces:**
- Consumes: existing `Pixels`, `History`/`initHistory`/`pushHistory`/`undo`/`redo` from `src/core/history.ts` (unchanged).
- Produces (replaces/extends the existing `EditorState`):
  - REMOVE: `showBefore: boolean`, `setShowBefore: (v: boolean) => void`
  - ADD: `compareMode: boolean`, `setCompareMode: (v: boolean) => void`
  - ADD: `loadWithHistory: (original: Pixels, current: Pixels) => void` — sets `original` to the given original and `history` to `initHistory(current)` (so the restored image becomes the new undo-less baseline).
  - Everything else (`original`, `history`, `activeTool`, `busy`, `previewOverride`, `current`, `load`, `commit`, `undo`, `redo`, `resetToOriginal`, `setTool`, `setBusy`, `setPreviewOverride`) is unchanged.

- [ ] **Step 1: Rewrite the store**

Replace the full contents of `src/state/editorStore.ts`:
```ts
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
```

- [ ] **Step 2: Verify build**

Run: `npx tsc -b`
Expected: FAILS at this point — `src/components/Toolbar.tsx` and `src/components/CanvasPreview.tsx` still reference `showBefore`/`setShowBefore`, which no longer exist. This is expected; Tasks 5 and 6 fix those files. Confirm the *only* errors are in `Toolbar.tsx` and `CanvasPreview.tsx` referencing the removed fields (no other unrelated errors).

- [ ] **Step 3: Commit**

```bash
git add src/state/editorStore.ts
git commit -m "refactor: replace showBefore toggle with compareMode, add loadWithHistory"
```

Note for the controller: this task intentionally leaves the build red. Task 5 (Toolbar) and Task 6 (CanvasPreview) must land before the app builds clean again — dispatch them next, in that order, before running any full verification.

---

## Task 4: Persistence sync, restore hook, and RestorePrompt

**Files:**
- Create: `src/state/persistenceSync.ts`
- Create: `src/components/RestorePrompt.tsx`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `useEditor` (specifically `loadWithHistory`, and the whole state shape) from `src/state/editorStore.ts` (Task 3); `saveSession`, `loadSession`, `clearSession` from `src/modules/persistence.ts` (Task 2); `Pixels`.
- Produces:
  - `initPersistenceAutoSave(): void` — call once at app startup; subscribes to the zustand store and debounce-saves `(original, history.present)` to IndexedDB 800ms after every `history` change.
  - `useSessionRestore(): { status: 'checking' | 'none' | 'found' | 'resolved'; accept: () => void; discard: () => void }` — a React hook that checks IndexedDB once on mount.
  - `RestorePrompt` component: `{ onRestore: () => void; onDiscard: () => void }` props, renders the Russian "restore last session?" prompt.

- [ ] **Step 1: Implement the sync module**

`src/state/persistenceSync.ts`:
```ts
import { useEffect, useRef, useState } from 'react'
import { useEditor } from './editorStore'
import { saveSession, loadSession, clearSession } from '../modules/persistence'
import { Pixels } from '../core/pixels'

const SAVE_DEBOUNCE_MS = 800

let saveTimer: ReturnType<typeof setTimeout> | null = null

export function initPersistenceAutoSave(): void {
  useEditor.subscribe((state, prevState) => {
    if (state.history === prevState.history) return
    if (!state.original || !state.history) return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      saveSession(state.original!, state.history!.present).catch(() => {})
    }, SAVE_DEBOUNCE_MS)
  })
}

type RestoreStatus = 'checking' | 'none' | 'found' | 'resolved'

export function useSessionRestore() {
  const [status, setStatus] = useState<RestoreStatus>('checking')
  const foundRef = useRef<{ original: Pixels; current: Pixels } | null>(null)
  const loadWithHistory = useEditor((s) => s.loadWithHistory)

  useEffect(() => {
    let cancelled = false
    loadSession()
      .then((session) => {
        if (cancelled) return
        if (session) {
          foundRef.current = session
          setStatus('found')
        } else {
          setStatus('none')
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('none')
      })
    return () => {
      cancelled = true
    }
  }, [])

  function accept() {
    if (foundRef.current) loadWithHistory(foundRef.current.original, foundRef.current.current)
    setStatus('resolved')
  }
  function discard() {
    clearSession().catch(() => {})
    setStatus('resolved')
  }

  return { status, accept, discard }
}
```

- [ ] **Step 2: Implement RestorePrompt**

`src/components/RestorePrompt.tsx`:
```tsx
interface Props {
  onRestore: () => void
  onDiscard: () => void
}

export default function RestorePrompt({ onRestore, onDiscard }: Props) {
  return (
    <div className="animate-rise-in flex flex-col items-center justify-center rounded-md border border-paper/10 bg-ink-raised/50 px-8 py-16 text-center">
      <p className="font-display text-xl italic text-paper/90">Есть незавершённая работа</p>
      <p className="mt-2 max-w-sm text-sm text-paper/50">
        Нашли фото, которое вы редактировали в прошлый раз. Продолжить с того места?
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={onRestore}
          className="rounded-sm bg-clay px-5 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:bg-clay-strong"
        >
          Продолжить
        </button>
        <button
          onClick={onDiscard}
          className="rounded-sm border border-paper/15 px-5 py-2 text-sm text-paper/70 transition-colors duration-150 hover:border-paper/30"
        >
          Начать заново
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Wire auto-save into the app entry point**

Modify `src/main.tsx` — full new content:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { initPersistenceAutoSave } from './state/persistenceSync'

initPersistenceAutoSave()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 4: Verify build**

Run: `npx tsc -b`
Expected: no NEW errors introduced by this task (the pre-existing `Toolbar.tsx`/`CanvasPreview.tsx` errors from Task 3 are still expected at this point — Task 5/6 fix those). `persistenceSync.ts`, `RestorePrompt.tsx`, and `main.tsx` themselves must type-check cleanly.

- [ ] **Step 5: Commit**

```bash
git add src/state/persistenceSync.ts src/components/RestorePrompt.tsx src/main.tsx
git commit -m "feat: add session auto-save and restore-prompt hook"
```

---

## Task 5: Toolbar — compareMode click-toggle

**Files:**
- Modify: `src/components/Toolbar.tsx`

**Interfaces:**
- Consumes: `useEditor` — now reads `compareMode`/`setCompareMode` instead of `showBefore`/`setShowBefore` (from Task 3's store).
- Produces: no new exports; this is the file that stops referencing the removed store fields.

- [ ] **Step 1: Replace the full file content**

`src/components/Toolbar.tsx`:
```tsx
import { useEditor, ToolId } from '../state/editorStore'
import { canUndo, canRedo } from '../core/history'

const TOOLS: { id: ToolId; label: string }[] = [
  { id: 'adjust', label: 'Улучшение' },
  { id: 'filters', label: 'Фильтры' },
  { id: 'background', label: 'Фон' },
  { id: 'heal', label: 'Лечащая кисть' },
  { id: 'transform', label: 'Кадр' },
]

function UndoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M3 6H9.5C11.4 6 13 7.6 13 9.5C13 11.4 11.4 13 9.5 13H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M6 3L3 6L6 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function RedoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M12 6H5.5C3.6 6 2 7.6 2 9.5C2 11.4 3.6 13 5.5 13H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M9 3L12 6L9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function ResetIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M12.5 7.5A5 5 0 1 1 10.9 3.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M12.5 2.5V6H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M1.5 7.5C1.5 7.5 4 3 7.5 3C11 3 13.5 7.5 13.5 7.5C13.5 7.5 11 12 7.5 12C4 12 1.5 7.5 1.5 7.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

export default function Toolbar() {
  const { activeTool, setTool, history, undo, redo, resetToOriginal, compareMode, setCompareMode } =
    useEditor()

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-paper/10 pb-4">
      <div className="flex flex-wrap gap-1">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            className={`rounded-sm px-3.5 py-1.5 text-sm transition-colors duration-150 ${
              activeTool === t.id
                ? 'bg-clay/15 text-clay-strong'
                : 'text-paper/55 hover:bg-paper/5 hover:text-paper/85'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 text-paper/50">
        <button
          disabled={!history || !canUndo(history)}
          onClick={undo}
          title="Отменить"
          className="rounded-sm p-2 transition-colors duration-150 hover:bg-paper/5 hover:text-paper disabled:opacity-25 disabled:hover:bg-transparent"
        >
          <UndoIcon />
        </button>
        <button
          disabled={!history || !canRedo(history)}
          onClick={redo}
          title="Повторить"
          className="rounded-sm p-2 transition-colors duration-150 hover:bg-paper/5 hover:text-paper disabled:opacity-25 disabled:hover:bg-transparent"
        >
          <RedoIcon />
        </button>
        <button
          onClick={resetToOriginal}
          title="Сбросить"
          className="rounded-sm p-2 transition-colors duration-150 hover:bg-paper/5 hover:text-paper"
        >
          <ResetIcon />
        </button>
        <span className="mx-1 h-4 w-px bg-paper/10" />
        <button
          onClick={() => setCompareMode(!compareMode)}
          title="Сравнить до/после"
          className={`flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-xs transition-colors duration-150 ${
            compareMode ? 'bg-clay/15 text-clay-strong' : 'hover:bg-paper/5 hover:text-paper'
          }`}
        >
          <EyeIcon />
          <span className="hidden sm:inline">до / после</span>
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc -b`
Expected: `Toolbar.tsx` no longer errors. Remaining errors, if any, must be confined to `CanvasPreview.tsx` (fixed next in Task 6).

- [ ] **Step 3: Commit**

```bash
git add src/components/Toolbar.tsx
git commit -m "feat: turn before/after button into a compareMode toggle"
```

---

## Task 6: CanvasPreview — draggable before/after compare slider

**Files:**
- Modify: `src/components/CanvasPreview.tsx`

**Interfaces:**
- Consumes: `useEditor` — `history`, `original`, `compareMode`, `previewOverride` (from Task 3's store); `pixelsToImageData` from `src/core/canvas.ts` (already implemented, unchanged).
- Produces: no new exports. This is a leaf UI component; nothing downstream depends on its internals.

Behavior: when `compareMode` is true AND there is at least one committed edit (`history.past.length > 0`) AND `original` exists, render a draggable split view — left portion shows `original`, right portion shows the current image (`previewOverride ?? history.present`), split by a vertical divider the user can drag with mouse or touch. Otherwise, render the plain current-image canvas exactly as before. The "after" canvas element must be the *same* DOM node whether or not compare mode is active, so live-preview updates (from `AdjustPanel`'s slider drag) keep painting into it without needing an extra render trigger tied to `compareMode` itself.

- [ ] **Step 1: Replace the full file content**

`src/components/CanvasPreview.tsx`:
```tsx
import { useEffect, useRef, useState, PointerEvent } from 'react'
import { useEditor } from '../state/editorStore'
import { pixelsToImageData } from '../core/canvas'

export default function CanvasPreview() {
  const history = useEditor((s) => s.history)
  const original = useEditor((s) => s.original)
  const compareMode = useEditor((s) => s.compareMode)
  const previewOverride = useEditor((s) => s.previewOverride)

  const afterImage = previewOverride ?? history?.present ?? null
  const showCompare = Boolean(compareMode && original && afterImage && history && history.past.length > 0)

  const beforeRef = useRef<HTMLCanvasElement | null>(null)
  const afterRef = useRef<HTMLCanvasElement | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const draggingRef = useRef(false)
  const [split, setSplit] = useState(50)

  useEffect(() => {
    const canvas = afterRef.current
    if (!canvas || !afterImage) return
    if (canvas.width !== afterImage.width) canvas.width = afterImage.width
    if (canvas.height !== afterImage.height) canvas.height = afterImage.height
    canvas.getContext('2d')!.putImageData(pixelsToImageData(afterImage), 0, 0)
  }, [afterImage])

  useEffect(() => {
    if (!showCompare || !original) return
    const canvas = beforeRef.current
    if (!canvas) return
    if (canvas.width !== original.width) canvas.width = original.width
    if (canvas.height !== original.height) canvas.height = original.height
    canvas.getContext('2d')!.putImageData(pixelsToImageData(original), 0, 0)
  }, [original, showCompare])

  function updateSplit(clientX: number) {
    const el = wrapperRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const pct = ((clientX - rect.left) / rect.width) * 100
    setSplit(Math.min(100, Math.max(0, pct)))
  }

  function onPointerDown(e: PointerEvent) {
    draggingRef.current = true
    updateSplit(e.clientX)
  }
  function onPointerMove(e: PointerEvent) {
    if (!draggingRef.current) return
    updateSplit(e.clientX)
  }
  function endDrag() {
    draggingRef.current = false
  }

  return (
    <div className="flex min-h-[40vh] items-center justify-center rounded-md border border-paper/10 bg-ink-raised/50 p-6 md:p-10">
      <div
        ref={wrapperRef}
        onPointerDown={showCompare ? onPointerDown : undefined}
        onPointerMove={showCompare ? onPointerMove : undefined}
        onPointerUp={showCompare ? endDrag : undefined}
        onPointerLeave={showCompare ? endDrag : undefined}
        className={`relative max-h-[68vh] max-w-full select-none drop-shadow-[0_20px_40px_rgba(0,0,0,0.45)] ${
          showCompare ? 'cursor-ew-resize' : ''
        }`}
      >
        {showCompare && (
          <canvas ref={beforeRef} className="block max-h-[68vh] max-w-full rounded-sm object-contain" />
        )}

        <div
          className={showCompare ? 'pointer-events-none absolute inset-0 overflow-hidden rounded-sm' : ''}
          style={showCompare ? { clipPath: `inset(0 ${100 - split}% 0 0)` } : undefined}
        >
          <canvas
            ref={afterRef}
            className={
              showCompare
                ? 'block h-full max-h-[68vh] w-full max-w-full object-contain'
                : 'max-h-[68vh] max-w-full rounded-sm object-contain'
            }
          />
        </div>

        {showCompare && (
          <>
            <div
              className="pointer-events-none absolute inset-y-0 w-px bg-paper/70"
              style={{ left: `${split}%` }}
            >
              <div className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-paper/40 bg-ink/80 text-paper/80">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M4.5 3L1.5 7L4.5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9.5 3L12.5 7L9.5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <span className="pointer-events-none absolute left-2 top-2 rounded-sm bg-ink/70 px-2 py-0.5 text-[10px] uppercase tracking-wider text-paper/60">
              до
            </span>
            <span className="pointer-events-none absolute right-2 top-2 rounded-sm bg-ink/70 px-2 py-0.5 text-[10px] uppercase tracking-wider text-paper/60">
              после
            </span>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify full project build**

Run: `npx tsc -b && npx vite build`
Expected: clean build, zero errors. This is the point where Tasks 3, 5, and 6 together resolve the intentionally-red build from Task 3.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: all existing tests still pass (this task touches no pure/tested logic).

- [ ] **Step 4: Commit**

```bash
git add src/components/CanvasPreview.tsx
git commit -m "feat: add draggable before/after compare slider to canvas preview"
```

---

## Task 7: FiltersPanel — live thumbnails per preset

**Files:**
- Modify: `src/components/FiltersPanel.tsx`

**Interfaces:**
- Consumes: `useEditor` (`current`, `commit`, and a selector on `history?.present` to know when to recompute); `PRESETS` from `src/core/filters.ts` (unchanged, `FilterPreset[]` with `{ id, name, apply(p: Pixels): Pixels }`); `createThumbnail` from `src/modules/thumbnail.ts` (Task 1); `pixelsToImageData` from `src/core/canvas.ts`; `Pixels` from `src/core/pixels.ts`.
- Produces: no new exports.

- [ ] **Step 1: Replace the full file content**

`src/components/FiltersPanel.tsx`:
```tsx
import { useEffect, useRef, useState } from 'react'
import { useEditor } from '../state/editorStore'
import { PRESETS } from '../core/filters'
import { createThumbnail } from '../modules/thumbnail'
import { pixelsToImageData } from '../core/canvas'
import { Pixels } from '../core/pixels'

const THUMB_SIZE = 96

function FilterThumb({ base, apply }: { base: Pixels; apply: (p: Pixels) => Pixels }) {
  const ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const result = apply(base)
    canvas.width = result.width
    canvas.height = result.height
    canvas.getContext('2d')!.putImageData(pixelsToImageData(result), 0, 0)
  }, [base, apply])

  return <canvas ref={ref} className="block h-16 w-full object-cover" />
}

export default function FiltersPanel() {
  const { current, commit } = useEditor()
  const historyPresent = useEditor((s) => s.history?.present)
  const [thumbBase, setThumbBase] = useState<Pixels | null>(null)

  useEffect(() => {
    const p = current()
    if (p) setThumbBase(createThumbnail(p, THUMB_SIZE))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyPresent])

  return (
    <div className="grid grid-cols-2 gap-2">
      {PRESETS.map((f) => (
        <button
          key={f.id}
          onClick={() => {
            const p = current()
            if (p) commit(f.apply(p))
          }}
          className="overflow-hidden rounded-sm border border-paper/10 text-sm text-paper/75 transition-colors duration-150 hover:border-clay/40 hover:text-clay-strong"
        >
          {thumbBase && <FilterThumb base={thumbBase} apply={f.apply} />}
          <span className="block py-2">{f.name}</span>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc -b && npx vite build`
Expected: clean, zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/FiltersPanel.tsx
git commit -m "feat: show live per-filter thumbnails in FiltersPanel"
```

---

## Task 8: jszip dependency and batch processing module

**Files:**
- Modify: `package.json` (add `jszip` dependency)
- Create: `src/modules/batch.ts`
- Test: `tests/modules/batch.test.ts`

**Interfaces:**
- Consumes: `Pixels` from `src/core/pixels.ts`; `fileToPixels`, `pixelsToBlob` from `src/core/canvas.ts` (already implemented, unchanged signatures); `JSZip` from the `jszip` package.
- Produces:
  - `interface BatchResult { fileName: string; error?: string }`
  - `processBatch(files: File[], operation: (p: Pixels) => Pixels, onProgress?: (done: number, total: number) => void): Promise<{ zip: Blob; results: BatchResult[] }>` — processes files sequentially; a per-file failure is recorded in `results` with an `error` message and does NOT abort the rest of the batch; `onProgress` is called once per file after it's processed (success or failure), with `done` being a running count.

- [ ] **Step 1: Add the dependency**

Run: `npm install jszip@^3.10.1`
Expected: `package.json` gains `"jszip": "^3.10.1"` under `dependencies`; `package-lock.json` updates.

- [ ] **Step 2: Write the failing test**

`tests/modules/batch.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPixels } from '../../src/core/pixels'

const fileToPixelsMock = vi.fn()
const pixelsToBlobMock = vi.fn()

vi.mock('../../src/core/canvas', () => ({
  fileToPixels: (...args: unknown[]) => fileToPixelsMock(...args),
  pixelsToBlob: (...args: unknown[]) => pixelsToBlobMock(...args),
}))

const zipFileMock = vi.fn()
const generateAsyncMock = vi.fn()

vi.mock('jszip', () => ({
  default: vi.fn().mockImplementation(() => ({
    file: zipFileMock,
    generateAsync: generateAsyncMock,
  })),
}))

import { processBatch } from '../../src/modules/batch'

function file(name: string): File {
  return new File([new Uint8Array([1])], name, { type: 'image/png' })
}

describe('processBatch', () => {
  beforeEach(() => {
    fileToPixelsMock.mockReset()
    pixelsToBlobMock.mockReset()
    zipFileMock.mockReset()
    generateAsyncMock.mockReset()
    generateAsyncMock.mockResolvedValue(new Blob(['zip']))
  })

  it('processes every file, adds each to the zip, and reports progress', async () => {
    fileToPixelsMock.mockResolvedValue(createPixels(2, 2))
    pixelsToBlobMock.mockResolvedValue(new Blob(['png']))
    const progressCalls: Array<[number, number]> = []

    const { zip, results } = await processBatch(
      [file('a.png'), file('b.jpg')],
      (p) => p,
      (done, total) => progressCalls.push([done, total]),
    )

    expect(zip).toBeInstanceOf(Blob)
    expect(results).toEqual([{ fileName: 'a.png' }, { fileName: 'b.jpg' }])
    expect(zipFileMock).toHaveBeenCalledTimes(2)
    expect(zipFileMock.mock.calls[0][0]).toBe('a-edited.png')
    expect(progressCalls).toEqual([[1, 2], [2, 2]])
  })

  it('continues processing after one file fails, recording its error', async () => {
    fileToPixelsMock
      .mockResolvedValueOnce(createPixels(2, 2))
      .mockRejectedValueOnce(new Error('NOT_AN_IMAGE'))
      .mockResolvedValueOnce(createPixels(2, 2))
    pixelsToBlobMock.mockResolvedValue(new Blob(['png']))

    const { results } = await processBatch(
      [file('good1.png'), file('bad.txt'), file('good2.png')],
      (p) => p,
    )

    expect(results).toHaveLength(3)
    expect(results[0].error).toBeUndefined()
    expect(results[1].error).toBeDefined()
    expect(results[2].error).toBeUndefined()
    expect(zipFileMock).toHaveBeenCalledTimes(2)
  })

  it('applies the given operation to every image before zipping', async () => {
    const base = createPixels(2, 2)
    fileToPixelsMock.mockResolvedValue(base)
    pixelsToBlobMock.mockResolvedValue(new Blob(['png']))
    const operation = vi.fn((p) => p)

    await processBatch([file('a.png')], operation)

    expect(operation).toHaveBeenCalledWith(base)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/modules/batch.test.ts`
Expected: FAIL (module `batch` not found).

- [ ] **Step 4: Implement**

`src/modules/batch.ts`:
```ts
import JSZip from 'jszip'
import { Pixels } from '../core/pixels'
import { fileToPixels, pixelsToBlob } from '../core/canvas'

export interface BatchResult {
  fileName: string
  error?: string
}

export async function processBatch(
  files: File[],
  operation: (p: Pixels) => Pixels,
  onProgress?: (done: number, total: number) => void,
): Promise<{ zip: Blob; results: BatchResult[] }> {
  const zip = new JSZip()
  const results: BatchResult[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    try {
      const p = await fileToPixels(file)
      const out = operation(p)
      const blob = await pixelsToBlob(out, 'image/png')
      const baseName = file.name.replace(/\.[^.]+$/, '') || `photo-${i + 1}`
      zip.file(`${baseName}-edited.png`, blob)
      results.push({ fileName: file.name })
    } catch {
      results.push({ fileName: file.name, error: 'Не удалось обработать файл' })
    }
    onProgress?.(i + 1, files.length)
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  return { zip: zipBlob, results }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/modules/batch.test.ts`
Expected: PASS (3 passed).

- [ ] **Step 6: Verify full build**

Run: `npx tsc -b && npx vite build`
Expected: clean, zero errors.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/modules/batch.ts tests/modules/batch.test.ts
git commit -m "feat: add jszip dependency and batch processing module"
```

---

## Task 9: BatchView component and App-level mode tabs

**Files:**
- Create: `src/components/BatchView.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `Pixels` from `src/core/pixels.ts`; `PRESETS` from `src/core/filters.ts`; `AdjustSettings`, `NEUTRAL_ADJUST`, `applyAdjustments` from `src/core/adjust.ts` (already implemented, unchanged); `processBatch`, `BatchResult` from `src/modules/batch.ts` (Task 8); `useSessionRestore` from `src/state/persistenceSync.ts` (Task 4); `RestorePrompt` from `src/components/RestorePrompt.tsx` (Task 4); `useEditor` from `src/state/editorStore.ts`.
- Produces: `BatchView` component (no props, self-contained). App.tsx gains local `mode: 'editor' | 'batch'` state — not part of the global store, since batch mode is a separate, session-less screen.

- [ ] **Step 1: Implement BatchView**

`src/components/BatchView.tsx`:
```tsx
import { useState } from 'react'
import { Pixels } from '../core/pixels'
import { PRESETS } from '../core/filters'
import { AdjustSettings, NEUTRAL_ADJUST, applyAdjustments } from '../core/adjust'
import { processBatch, BatchResult } from '../modules/batch'

type Mode = 'filter' | 'adjust'

const ADJUST_FIELDS: { key: keyof AdjustSettings; label: string; min: number }[] = [
  { key: 'brightness', label: 'Яркость', min: -100 },
  { key: 'contrast', label: 'Контраст', min: -100 },
  { key: 'saturation', label: 'Насыщенность', min: -100 },
  { key: 'warmth', label: 'Теплота', min: -100 },
  { key: 'sharpness', label: 'Резкость', min: 0 },
]

export default function BatchView() {
  const [files, setFiles] = useState<File[]>([])
  const [mode, setMode] = useState<Mode>('filter')
  const [presetId, setPresetId] = useState(PRESETS[1]?.id ?? PRESETS[0].id)
  const [adjust, setAdjust] = useState<AdjustSettings>(NEUTRAL_ADJUST)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [results, setResults] = useState<BatchResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  function operation(p: Pixels): Pixels {
    if (mode === 'filter') {
      const preset = PRESETS.find((f) => f.id === presetId) ?? PRESETS[0]
      return preset.apply(p)
    }
    return applyAdjustments(p, adjust)
  }

  async function run() {
    if (files.length === 0) return
    setBusy(true)
    setError(null)
    setResults(null)
    setProgress({ done: 0, total: files.length })
    try {
      const { zip, results: r } = await processBatch(files, operation, (done, total) =>
        setProgress({ done, total }),
      )
      setResults(r)
      const url = URL.createObjectURL(zip)
      const a = document.createElement('a')
      a.href = url
      a.download = 'photos-edited.zip'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Не удалось обработать пакет. Попробуйте ещё раз.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="animate-rise-in space-y-6">
      <label className="block cursor-pointer rounded-md border border-dashed border-paper/15 py-10 text-center transition-colors duration-200 hover:border-clay/40">
        <p className="text-sm text-paper/60">
          {files.length > 0 ? `Выбрано файлов: ${files.length}` : 'Выберите несколько фото'}
        </p>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
        />
      </label>

      <div className="flex gap-1">
        <button
          onClick={() => setMode('filter')}
          className={`rounded-sm px-3.5 py-1.5 text-sm transition-colors duration-150 ${
            mode === 'filter' ? 'bg-clay/15 text-clay-strong' : 'text-paper/55 hover:bg-paper/5'
          }`}
        >
          Фильтр
        </button>
        <button
          onClick={() => setMode('adjust')}
          className={`rounded-sm px-3.5 py-1.5 text-sm transition-colors duration-150 ${
            mode === 'adjust' ? 'bg-clay/15 text-clay-strong' : 'text-paper/55 hover:bg-paper/5'
          }`}
        >
          Коррекция
        </button>
      </div>

      {mode === 'filter' ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRESETS.map((f) => (
            <button
              key={f.id}
              onClick={() => setPresetId(f.id)}
              className={`rounded-sm border py-2 text-sm transition-colors duration-150 ${
                presetId === f.id
                  ? 'border-clay/50 text-clay-strong'
                  : 'border-paper/10 text-paper/75 hover:border-paper/30'
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>
      ) : (
        <div className="max-w-sm space-y-4">
          {ADJUST_FIELDS.map((f) => (
            <label key={f.key} className="block">
              <div className="mb-1.5 flex items-baseline justify-between text-xs uppercase tracking-wider text-paper/40">
                <span>{f.label}</span>
                <span className="tabular-nums text-clay-strong/90">{adjust[f.key]}</span>
              </div>
              <input
                type="range"
                min={f.min}
                max={100}
                value={adjust[f.key]}
                onChange={(e) => setAdjust({ ...adjust, [f.key]: Number(e.target.value) })}
                className="w-full"
              />
            </label>
          ))}
        </div>
      )}

      <button
        disabled={busy || files.length === 0}
        onClick={run}
        className="rounded-sm bg-clay px-6 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:bg-clay-strong disabled:opacity-40"
      >
        {busy && progress ? `Обработка… ${progress.done} из ${progress.total}` : 'Обработать и скачать ZIP'}
      </button>

      {error && <p className="text-sm text-coral">{error}</p>}

      {results && (
        <ul className="space-y-1 text-sm text-paper/60">
          {results.map((r) => (
            <li key={r.fileName} className={r.error ? 'text-coral' : ''}>
              {r.fileName} {r.error ? `— ${r.error}` : '— готово'}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Wire mode tabs and restore prompt into App.tsx**

Replace the full contents of `src/App.tsx`:
```tsx
import { useState } from 'react'
import { useEditor } from './state/editorStore'
import Uploader from './components/Uploader'
import CanvasPreview from './components/CanvasPreview'
import Toolbar from './components/Toolbar'
import AdjustPanel from './components/AdjustPanel'
import FiltersPanel from './components/FiltersPanel'
import BackgroundPanel from './components/BackgroundPanel'
import HealPanel from './components/HealPanel'
import TransformPanel from './components/TransformPanel'
import ExportBar from './components/ExportBar'
import BatchView from './components/BatchView'
import RestorePrompt from './components/RestorePrompt'
import { useSessionRestore } from './state/persistenceSync'

type Mode = 'editor' | 'batch'

export default function App() {
  const hasImage = useEditor((s) => s.history !== null)
  const tool = useEditor((s) => s.activeTool)
  const [mode, setMode] = useState<Mode>('editor')
  const restore = useSessionRestore()

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-paper/10 pb-6 animate-rise-in">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-paper/40">Домашняя фотостудия</p>
            <h1 className="mt-1 font-display text-3xl italic text-paper md:text-4xl">Фоторедактор</h1>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex gap-1">
              <button
                onClick={() => setMode('editor')}
                className={`rounded-sm px-3 py-1.5 text-sm transition-colors duration-150 ${
                  mode === 'editor' ? 'bg-clay/15 text-clay-strong' : 'text-paper/55 hover:bg-paper/5'
                }`}
              >
                Редактор
              </button>
              <button
                onClick={() => setMode('batch')}
                className={`rounded-sm px-3 py-1.5 text-sm transition-colors duration-150 ${
                  mode === 'batch' ? 'bg-clay/15 text-clay-strong' : 'text-paper/55 hover:bg-paper/5'
                }`}
              >
                Пакетная обработка
              </button>
            </div>
            {mode === 'editor' && hasImage && <ExportBar />}
          </div>
        </header>

        {mode === 'batch' ? (
          <BatchView />
        ) : restore.status === 'checking' ? null : restore.status === 'found' ? (
          <RestorePrompt onRestore={restore.accept} onDiscard={restore.discard} />
        ) : !hasImage ? (
          <Uploader />
        ) : (
          <div className="flex flex-col gap-6">
            <div className="animate-rise-in [animation-delay:80ms]">
              <Toolbar />
            </div>
            <div className="grid gap-6 md:grid-cols-[1fr_320px]">
              <div className="order-2 md:order-1 animate-rise-in [animation-delay:140ms]">
                <CanvasPreview />
              </div>
              <aside className="order-1 md:order-2 h-fit rounded-md border border-paper/10 bg-ink-raised p-5 animate-rise-in [animation-delay:180ms]">
                {tool === 'adjust' && <AdjustPanel />}
                {tool === 'filters' && <FiltersPanel />}
                {tool === 'background' && <BackgroundPanel />}
                {tool === 'heal' && <HealPanel />}
                {tool === 'transform' && <TransformPanel />}
              </aside>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify full build and test suite**

Run: `npx tsc -b && npx vite build && npm test`
Expected: clean build; all tests pass (thumbnail: 4, batch: 3, plus all pre-existing tests unchanged).

- [ ] **Step 4: Commit**

```bash
git add src/components/BatchView.tsx src/App.tsx
git commit -m "feat: add batch processing view and editor/batch mode tabs"
```

---

## Task 10: End-to-end manual verification

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Start the dev server and verify each feature in a real browser**

Run: `npm run dev` (or use the project's preview tooling)

Manually verify, using a real or synthetically-uploaded test image:
1. **Compare slider:** upload a photo, apply any edit (e.g. a filter), click "до / после" in the toolbar, drag the divider left and right over the canvas — confirm the left/right split follows the pointer smoothly and shows original vs. edited correctly, with mouse AND touch-style pointer events. Confirm the button toggles the mode off again and the plain canvas returns.
2. **Filter thumbnails:** open the "Фильтры" panel — confirm each preset button shows a small live preview of your actual photo with that filter applied (not a placeholder), and that thumbnails update after further edits.
3. **Session persistence:** upload a photo, make an edit, wait ~1 second (debounce), then reload the page — confirm the "Есть незавершённая работа" prompt appears; click "Продолжить" and confirm the edited image reloads; reload again and click "Начать заново" and confirm it clears (Uploader shown, no prompt on next reload).
4. **Batch processing:** click "Пакетная обработка" in the header, select 2+ photos, pick a filter (or switch to "Коррекция" and move a slider), click "Обработать и скачать ZIP" — confirm progress text updates, a `photos-edited.zip` downloads, and it contains one edited PNG per input photo.

- [ ] **Step 2: Confirm no regressions in the existing single-image editor**

Verify upload, adjust (live slider drag — from the earlier live-preview feature), background removal, heal brush, crop/rotate, undo/redo, and export all still work exactly as before (this plan should not have changed any of their logic).

- [ ] **Step 3: Final full-suite check and push readiness**

Run: `npx tsc -b && npx vite build && npm test`
Expected: clean build, all tests passing. Report the final test count and confirm the working tree is clean (`git status`) before handing back to the controller for the final review.

---

## Self-Review

**Spec coverage:**
- Draggable before/after compare slider → Task 3 (store) + Task 5 (toolbar toggle) + Task 6 (canvas split view). ✅
- Filter thumbnails → Task 1 (pure downscale) + Task 7 (panel wiring). ✅
- Session persistence with restore prompt → Task 2 (IndexedDB) + Task 4 (sync/hook/prompt/wiring). ✅
- Batch processing (multi-upload → one filter/adjustment → ZIP download) → Task 8 (jszip + orchestration) + Task 9 (UI + mode tabs). ✅
- All local/free, no server, no API keys → Global Constraints states this explicitly; `jszip` and IndexedDB are both client-side only. ✅
- Design consistency with existing warm-minimal system → Global Constraints names the exact tokens; every new component in Tasks 4, 6, 7, 9 uses them. ✅

**Placeholder scan:** no TBD/TODO/"handle edge cases" phrases; every code step is complete, runnable code.

**Type consistency:** `Pixels`, `AdjustSettings`, `FilterPreset`, `BatchResult` are used with identical shapes across every task that touches them; `compareMode`/`setCompareMode`/`loadWithHistory` are defined once in Task 3 and consumed with matching names in Tasks 4–7 and 9; `createThumbnail(p, maxSize)` signature from Task 1 matches its Task 7 call site; `processBatch(files, operation, onProgress)` signature from Task 8 matches its Task 9 call site.

**Sequencing note:** Task 3 intentionally leaves the build red until Tasks 5 and 6 land (both consume the renamed store fields). Dispatch order must be 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 — do not reorder 5/6 after 7 or later, and do not skip straight from 3 to 7.
