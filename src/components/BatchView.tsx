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
