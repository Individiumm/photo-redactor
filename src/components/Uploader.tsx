import { useState, DragEvent } from 'react'
import { useEditor } from '../state/editorStore'
import { fileToPixels } from '../core/canvas'

export default function Uploader() {
  const load = useEditor((s) => s.load)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)
    try {
      load(await fileToPixels(file))
    } catch {
      setError('Это не похоже на изображение. Загрузите JPG, PNG или WebP.')
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={`animate-rise-in flex flex-col items-center justify-center rounded-md border px-8 py-24 text-center transition-colors duration-200 ${
        isDragging ? 'border-clay/60 bg-clay/5' : 'border-paper/15'
      }`}
      style={{ borderStyle: 'dashed' }}
    >
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
        className="mb-6 text-paper/30"
      >
        <rect x="5" y="8" width="30" height="24" rx="2" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="14" cy="16" r="2.4" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5 27L14 20L21 25L28 18L35 24" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>

      <p className="font-display text-xl italic text-paper/90 md:text-2xl">
        Перетащите фото сюда
      </p>
      <p className="mt-2 text-sm text-paper/40">или выберите файл со своего устройства</p>

      <label className="mt-8 cursor-pointer rounded-sm border border-clay/50 px-6 py-2.5 text-sm font-medium tracking-wide text-clay-strong transition-colors duration-200 hover:bg-clay/10">
        Выбрать файл
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>

      {error && <p className="mt-6 text-sm text-coral">{error}</p>}

      <p className="mt-14 max-w-xs text-xs leading-relaxed text-paper/25">
        Обработка происходит прямо в браузере — фотографии никогда не покидают ваше устройство.
      </p>
    </div>
  )
}
