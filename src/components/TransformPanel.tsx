import { useEditor } from '../state/editorStore'
import { rotate90, crop, ASPECTS } from '../modules/transform'

function RotateCcwIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M12.5 7.5A5 5 0 1 1 9.6 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M9.6 0V3.6H13.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function RotateCwIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M2.5 7.5A5 5 0 1 0 5.4 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M5.4 0V3.6H1.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

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
    <div className="space-y-5">
      <div>
        <p className="mb-1.5 text-xs uppercase tracking-wider text-paper/40">Поворот</p>
        <div className="flex gap-2">
          <button
            onClick={() => rotate('ccw')}
            className="flex flex-1 items-center justify-center gap-2 rounded-sm border border-paper/15 py-2 text-sm text-paper/75 transition-colors duration-150 hover:border-paper/30"
          >
            <RotateCcwIcon /> Влево
          </button>
          <button
            onClick={() => rotate('cw')}
            className="flex flex-1 items-center justify-center gap-2 rounded-sm border border-paper/15 py-2 text-sm text-paper/75 transition-colors duration-150 hover:border-paper/30"
          >
            <RotateCwIcon /> Вправо
          </button>
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs uppercase tracking-wider text-paper/40">Кадрирование</p>
        <div className="grid grid-cols-2 gap-2">
          {ASPECTS.filter((a) => a.ratio !== null).map((a) => (
            <button
              key={a.id}
              onClick={() => cropAspect(a.ratio)}
              className="rounded-sm border border-paper/10 py-2 text-sm text-paper/75 transition-colors duration-150 hover:border-clay/40 hover:text-clay-strong"
            >
              {a.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
