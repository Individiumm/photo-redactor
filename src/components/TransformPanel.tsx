import { useEditor } from '../state/editorStore'
import { rotate90, crop, ASPECTS } from '../modules/transform'

export default function TransformPanel() {
  const { current, commit } = useEditor()

  function rotate(dir: 'cw' | 'ccw') {
    const p = current()
    if (p) commit(rotate90(p, dir))
  }
  function cropAspect(ratio: number | null) {
    const p = current()
    if (!p || ratio === null) return
    let w = p.width
    let h = Math.round(w / ratio)
    if (h > p.height) { h = p.height; w = Math.round(h * ratio) }
    const x = Math.floor((p.width - w) / 2)
    const y = Math.floor((p.height - h) / 2)
    commit(crop(p, x, y, w, h))
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={() => rotate('ccw')} className="flex-1 rounded bg-neutral-800 py-2">↺ Влево</button>
        <button onClick={() => rotate('cw')} className="flex-1 rounded bg-neutral-800 py-2">↻ Вправо</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {ASPECTS.filter((a) => a.ratio !== null).map((a) => (
          <button key={a.id} onClick={() => cropAspect(a.ratio)} className="rounded bg-neutral-800 py-2 text-sm">{a.name}</button>
        ))}
      </div>
    </div>
  )
}
