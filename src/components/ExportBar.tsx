import { useState } from 'react'
import { useEditor } from '../state/editorStore'
import { exportImage, ExportFormat } from '../modules/exporter'

export default function ExportBar() {
  const current = useEditor((s) => s.current)
  const [format, setFormat] = useState<ExportFormat>('png')
  const [quality, setQuality] = useState(0.92)

  async function save() {
    const p = current()
    if (p) await exportImage(p, format, quality)
  }

  return (
    <div className="flex items-center gap-2">
      <select value={format} onChange={(e) => setFormat(e.target.value as ExportFormat)} className="rounded bg-neutral-800 px-2 py-1">
        <option value="png">PNG</option>
        <option value="jpeg">JPG</option>
      </select>
      {format === 'jpeg' && (
        <input type="range" min={0.3} max={1} step={0.01} value={quality} onChange={(e) => setQuality(Number(e.target.value))} />
      )}
      <button onClick={save} className="rounded bg-emerald-600 px-4 py-2">Скачать</button>
    </div>
  )
}
