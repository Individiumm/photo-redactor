import { useState, DragEvent } from 'react'
import { useEditor } from '../state/editorStore'
import { fileToPixels } from '../core/canvas'

export default function Uploader() {
  const load = useEditor((s) => s.load)
  const [error, setError] = useState<string | null>(null)

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
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-700 rounded-2xl p-16 text-center"
    >
      <p className="text-lg mb-4">Перетащите фото сюда или выберите файл</p>
      <label className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 hover:bg-indigo-500">
        Выбрать файл
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>
      {error && <p className="mt-4 text-red-400">{error}</p>}
    </div>
  )
}
