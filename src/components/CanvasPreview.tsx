import { useEffect, useRef } from 'react'
import { useEditor } from '../state/editorStore'
import { pixelsToImageData } from '../core/canvas'

export default function CanvasPreview() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const history = useEditor((s) => s.history)
  const original = useEditor((s) => s.original)
  const showBefore = useEditor((s) => s.showBefore)
  const previewOverride = useEditor((s) => s.previewOverride)

  const shown = showBefore ? original : previewOverride ?? history?.present ?? null

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !shown) return
    if (canvas.width !== shown.width) canvas.width = shown.width
    if (canvas.height !== shown.height) canvas.height = shown.height
    canvas.getContext('2d')!.putImageData(pixelsToImageData(shown), 0, 0)
  }, [shown])

  return (
    <div className="flex min-h-[40vh] items-center justify-center rounded-md border border-paper/10 bg-ink-raised/50 p-6 md:p-10">
      <canvas
        ref={canvasRef}
        className="max-h-[68vh] max-w-full rounded-sm object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.45)]"
      />
    </div>
  )
}
