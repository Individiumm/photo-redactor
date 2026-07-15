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
