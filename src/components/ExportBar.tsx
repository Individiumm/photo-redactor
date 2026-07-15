import { useState } from 'react'
import { useEditor } from '../state/editorStore'
import { exportImage, ExportFormat } from '../modules/exporter'

export default function ExportBar() {
  const current = useEditor((s) => s.current)
  const [format, setFormat] = useState<ExportFormat>('png')
  const [quality, setQuality] = useState(0.92)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    const p = current()
    if (!p) return
    setError(null)
    try {
      await exportImage(p, format, quality)
    } catch {
      setError('Не удалось сохранить файл. Попробуйте ещё раз.')
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as ExportFormat)}
          className="rounded-sm border border-paper/15 bg-transparent px-2 py-1.5 text-sm text-paper/75"
        >
          <option className="bg-ink-raised" value="png">PNG</option>
          <option className="bg-ink-raised" value="jpeg">JPG</option>
        </select>
        {format === 'jpeg' && (
          <input
            type="range"
            min={0.3}
            max={1}
            step={0.01}
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="w-20"
          />
        )}
      </div>
      <button
        onClick={save}
        className="rounded-sm bg-clay px-5 py-1.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-clay-strong"
      >
        Скачать
      </button>
      {error && <p className="text-sm text-coral">{error}</p>}
    </div>
  )
}
