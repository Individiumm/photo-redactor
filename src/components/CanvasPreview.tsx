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
    canvas.className = 'max-h-[70vh] max-w-full object-contain rounded-lg shadow-lg'
    ref.current.replaceChildren(canvas)
  }, [shown])

  return <div ref={ref} className="flex items-center justify-center" />
}
