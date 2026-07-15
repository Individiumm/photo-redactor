import { useEffect, useRef } from 'react'
import { useEditor } from '../state/editorStore'
import { pixelsToCanvas } from '../core/canvas'

export default function CanvasPreview() {
  const ref = useRef<HTMLDivElement>(null)
  const history = useEditor((s) => s.history)
  const original = useEditor((s) => s.original)
  const showBefore = useEditor((s) => s.showBefore)

  const shown = showBefore ? original : history?.present ?? null

  useEffect(() => {
    if (!ref.current || !shown) return
    const canvas = pixelsToCanvas(shown)
    canvas.className = 'max-h-[68vh] max-w-full object-contain rounded-sm'
    ref.current.replaceChildren(canvas)
  }, [shown])

  return (
    <div className="flex min-h-[40vh] items-center justify-center rounded-md border border-paper/10 bg-ink-raised/50 p-6 md:p-10">
      <div ref={ref} className="flex items-center justify-center drop-shadow-[0_20px_40px_rgba(0,0,0,0.45)]" />
    </div>
  )
}
