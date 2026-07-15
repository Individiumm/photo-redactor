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
    <div className="space-y-3">
      <button onClick={auto} className="w-full rounded bg-emerald-600 py-2">Авто-улучшение</button>
      {FIELDS.map((f) => (
        <label key={f.key} className="block text-sm">
          {f.label}: {s[f.key]}
          <input
            type="range" min={f.min} max={100} value={s[f.key]}
            onChange={(e) => setS({ ...s, [f.key]: Number(e.target.value) })}
            className="w-full"
          />
        </label>
      ))}
      <button onClick={apply} className="w-full rounded bg-indigo-600 py-2">Применить</button>
    </div>
  )
}
