import { useEffect, useRef, useState } from 'react'
import { useEditor } from '../state/editorStore'
import { Pixels } from '../core/pixels'
import { AdjustSettings, NEUTRAL_ADJUST, applyAdjustments, autoEnhance } from '../core/adjust'

const FIELDS: { key: keyof AdjustSettings; label: string; min: number }[] = [
  { key: 'brightness', label: 'Яркость', min: -100 },
  { key: 'contrast', label: 'Контраст', min: -100 },
  { key: 'saturation', label: 'Насыщенность', min: -100 },
  { key: 'warmth', label: 'Теплота', min: -100 },
  { key: 'sharpness', label: 'Резкость', min: 0 },
]

export default function AdjustPanel() {
  const { current, commit, setPreviewOverride } = useEditor()
  const [s, setS] = useState<AdjustSettings>(NEUTRAL_ADJUST)
  // Mirrors `s` for reads inside event handlers. A real mouse release fires
  // both `pointerup` and `mouseup`; whichever handler runs first commits and
  // the other must see the same up-to-date values regardless of whether
  // React has re-rendered (and thus refreshed handler closures) in between —
  // a plain `useState` read here could still be stale, a ref never is.
  const draftRef = useRef<AdjustSettings>(NEUTRAL_ADJUST)
  // The image the slider values are relative to — captured once when a drag
  // starts, so mid-drag re-renders don't keep re-reading a moving target.
  const baseRef = useRef<Pixels | null>(null)

  // Discard an in-progress (uncommitted) preview if this panel goes away
  // mid-drag, e.g. the user switches tools without releasing the slider.
  useEffect(() => () => setPreviewOverride(null), [setPreviewOverride])

  function handleChange(key: keyof AdjustSettings, value: number) {
    if (!baseRef.current) baseRef.current = current()
    const base = baseRef.current
    if (!base) return
    const next = { ...draftRef.current, [key]: value }
    draftRef.current = next
    setS(next)
    setPreviewOverride(applyAdjustments(base, next))
  }

  function commitDrag() {
    const base = baseRef.current
    if (!base) return
    commit(applyAdjustments(base, draftRef.current))
    setPreviewOverride(null)
    baseRef.current = null
    draftRef.current = NEUTRAL_ADJUST
    setS(NEUTRAL_ADJUST)
  }

  function auto() {
    const p = current()
    if (p) commit(autoEnhance(p))
  }

  return (
    <div className="space-y-5">
      <button
        onClick={auto}
        className="w-full rounded-sm border border-paper/15 py-2 text-sm text-paper/80 transition-colors duration-150 hover:border-paper/30 hover:bg-paper/5"
      >
        Авто-улучшение
      </button>

      <div className="space-y-4">
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <div className="mb-1.5 flex items-baseline justify-between text-xs uppercase tracking-wider text-paper/40">
              <span>{f.label}</span>
              <span className="tabular-nums text-clay-strong/90">{s[f.key]}</span>
            </div>
            <input
              type="range"
              min={f.min}
              max={100}
              value={s[f.key]}
              onChange={(e) => handleChange(f.key, Number(e.target.value))}
              onPointerUp={commitDrag}
              onMouseUp={commitDrag}
              onTouchEnd={commitDrag}
              onKeyUp={commitDrag}
              className="w-full"
            />
          </label>
        ))}
      </div>
    </div>
  )
}
