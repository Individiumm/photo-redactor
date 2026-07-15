import { useState } from 'react'
import { useEditor } from '../state/editorStore'
import { AdjustSettings, NEUTRAL_ADJUST, applyAdjustments, autoEnhance } from '../core/adjust'

const FIELDS: { key: keyof AdjustSettings; label: string; min: number }[] = [
  { key: 'brightness', label: 'Яркость', min: -100 },
  { key: 'contrast', label: 'Контраст', min: -100 },
  { key: 'saturation', label: 'Насыщенность', min: -100 },
  { key: 'warmth', label: 'Теплота', min: -100 },
  { key: 'sharpness', label: 'Резкость', min: 0 },
]

export default function AdjustPanel() {
  const { current, commit } = useEditor()
  const [s, setS] = useState<AdjustSettings>(NEUTRAL_ADJUST)

  function apply() {
    const p = current()
    if (p) commit(applyAdjustments(p, s))
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
              onChange={(e) => setS({ ...s, [f.key]: Number(e.target.value) })}
              className="w-full"
            />
          </label>
        ))}
      </div>

      <button
        onClick={apply}
        className="w-full rounded-sm bg-clay py-2 text-sm font-medium text-ink transition-colors duration-150 hover:bg-clay-strong"
      >
        Применить
      </button>
    </div>
  )
}
