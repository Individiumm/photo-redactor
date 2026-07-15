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
    <div className="space-y-4">
      <button
        disabled={busy}
        onClick={remove}
        className="w-full rounded-sm bg-clay py-2 text-sm font-medium text-ink transition-colors duration-150 hover:bg-clay-strong disabled:opacity-40"
      >
        {busy ? 'Обработка… (загрузка модели при первом запуске)' : 'Удалить фон'}
      </button>

      {cut && (
        <div className="space-y-2 border-t border-paper/10 pt-4">
          <p className="text-xs uppercase tracking-wider text-paper/40">Новый фон</p>
          <div className="flex gap-2">
            <button
              onClick={() => fill([242, 236, 225])}
              className="flex-1 rounded-sm border border-paper/15 py-2 text-sm text-paper/75 transition-colors duration-150 hover:border-paper/30"
            >
              Белый
            </button>
            <button
              onClick={() => fill([16, 15, 13])}
              className="flex-1 rounded-sm border border-paper/15 py-2 text-sm text-paper/75 transition-colors duration-150 hover:border-paper/30"
            >
              Чёрный
            </button>
          </div>
          <label className="block cursor-pointer rounded-sm border border-dashed border-paper/15 py-2 text-center text-sm text-paper/55 transition-colors duration-150 hover:border-clay/40 hover:text-clay-strong">
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

      {error && <p className="text-sm text-coral">{error}</p>}
    </div>
  )
}
