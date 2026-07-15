import { useState } from 'react'
import { useEditor } from '../state/editorStore'
import { removeBackground, fillBackground } from '../modules/background'

export default function BackgroundPanel() {
  const { current, commit, busy, setBusy } = useEditor()
  const [cut, setCut] = useState(false)

  async function remove() {
    const p = current()
    if (!p) return
    setBusy(true)
    try {
      commit(await removeBackground(p))
      setCut(true)
    } finally {
      setBusy(false)
    }
  }
  function fill(color: [number, number, number]) {
    const p = current()
    if (p) commit(fillBackground(p, color))
  }

  return (
    <div className="space-y-3">
      <button disabled={busy} onClick={remove} className="w-full rounded bg-indigo-600 py-2 disabled:opacity-50">
        {busy ? 'Обработка… (загрузка модели при первом запуске)' : 'Удалить фон'}
      </button>
      {cut && (
        <div className="flex gap-2">
          <button onClick={() => fill([255, 255, 255])} className="flex-1 rounded bg-neutral-200 text-black py-2">Белый</button>
          <button onClick={() => fill([0, 0, 0])} className="flex-1 rounded bg-black py-2">Чёрный</button>
        </div>
      )}
    </div>
  )
}
