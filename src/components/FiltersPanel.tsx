import { useEffect, useRef, useState } from 'react'
import { useEditor } from '../state/editorStore'
import { PRESETS } from '../core/filters'
import { createThumbnail } from '../modules/thumbnail'
import { pixelsToImageData } from '../core/canvas'
import { Pixels } from '../core/pixels'

const THUMB_SIZE = 96

function FilterThumb({ base, apply }: { base: Pixels; apply: (p: Pixels) => Pixels }) {
  const ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const result = apply(base)
    canvas.width = result.width
    canvas.height = result.height
    canvas.getContext('2d')!.putImageData(pixelsToImageData(result), 0, 0)
  }, [base, apply])

  return <canvas ref={ref} className="block h-16 w-full object-cover" />
}

export default function FiltersPanel() {
  const { current, commit } = useEditor()
  const historyPresent = useEditor((s) => s.history?.present)
  const [thumbBase, setThumbBase] = useState<Pixels | null>(null)

  useEffect(() => {
    const p = current()
    if (p) setThumbBase(createThumbnail(p, THUMB_SIZE))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyPresent])

  return (
    <div className="grid grid-cols-2 gap-2">
      {PRESETS.map((f) => (
        <button
          key={f.id}
          onClick={() => {
            const p = current()
            if (p) commit(f.apply(p))
          }}
          className="overflow-hidden rounded-sm border border-paper/10 text-sm text-paper/75 transition-colors duration-150 hover:border-clay/40 hover:text-clay-strong"
        >
          {thumbBase && <FilterThumb base={thumbBase} apply={f.apply} />}
          <span className="block py-2">{f.name}</span>
        </button>
      ))}
    </div>
  )
}
