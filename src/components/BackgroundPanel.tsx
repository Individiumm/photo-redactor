import { useState } from 'react'
import { useEditor } from '../state/editorStore'
import { removeBackground, fillBackground, compositeOver } from '../modules/background'
import { fileToPixels } from '../core/canvas'
import { resize } from '../modules/transform'

export default function BackgroundPanel() {
  const { current, commit, busy, setBusy } = useEditor()
  const [cut, setCut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    const p = current()
    if (!p) return
    setBusy(true)
    setError(null)
    try {
      commit(await removeBackground(p))
      setCut(true)
    } catch {
      setError('Не удалось удалить фон. Попробуйте другое фото.')
    } finally {
      setBusy(false)
    }
  }
  function fill(color: [number, number, number]) {
    const p = current()
    if (p) commit(fillBackground(p, color))
  }
  async function useImageBackground(file: File | undefined) {
    if (!file) return
    const p = current()
    if (!p) return
    setBusy(true)
    setError(null)
    try {
      const bg = await fileToPixels(file)
      commit(compositeOver(p, resize(bg, p.width, p.height)))
    } catch {
      setError('Это не похоже на изображение. Загрузите JPG, PNG или WebP.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <button disabled={busy} onClick={remove} className="w-full rounded bg-indigo-600 py-2 disabled:opacity-50">
        {busy ? 'Обработка… (загрузка модели при первом запуске)' : 'Удалить фон'}
      </button>
      {cut && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button onClick={() => fill([255, 255, 255])} className="flex-1 rounded bg-neutral-200 text-black py-2">Белый</button>
            <button onClick={() => fill([0, 0, 0])} className="flex-1 rounded bg-black py-2">Чёрный</button>
          </div>
          <label className="block cursor-pointer rounded bg-neutral-800 py-2 text-center text-sm hover:bg-neutral-700">
            Своя картинка фона
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={busy}
              onChange={(e) => useImageBackground(e.target.files?.[0])}
            />
          </label>
        </div>
      )}
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  )
}
