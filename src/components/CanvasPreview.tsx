import { useEffect, useRef, useState, PointerEvent } from 'react'
import { useEditor } from '../state/editorStore'
import { pixelsToImageData } from '../core/canvas'

export default function CanvasPreview() {
  const history = useEditor((s) => s.history)
  const original = useEditor((s) => s.original)
  const compareMode = useEditor((s) => s.compareMode)
  const previewOverride = useEditor((s) => s.previewOverride)

  const afterImage = previewOverride ?? history?.present ?? null
  const showCompare = Boolean(compareMode && original && afterImage && history && history.past.length > 0)

  const beforeRef = useRef<HTMLCanvasElement | null>(null)
  const afterRef = useRef<HTMLCanvasElement | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const draggingRef = useRef(false)
  const [split, setSplit] = useState(50)

  useEffect(() => {
    const canvas = afterRef.current
    if (!canvas || !afterImage) return
    if (canvas.width !== afterImage.width) canvas.width = afterImage.width
    if (canvas.height !== afterImage.height) canvas.height = afterImage.height
    canvas.getContext('2d')!.putImageData(pixelsToImageData(afterImage), 0, 0)
  }, [afterImage])

  useEffect(() => {
    if (!showCompare || !original) return
    const canvas = beforeRef.current
    if (!canvas) return
    if (canvas.width !== original.width) canvas.width = original.width
    if (canvas.height !== original.height) canvas.height = original.height
    canvas.getContext('2d')!.putImageData(pixelsToImageData(original), 0, 0)
  }, [original, showCompare])

  function updateSplit(clientX: number) {
    const el = wrapperRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const pct = ((clientX - rect.left) / rect.width) * 100
    setSplit(Math.min(100, Math.max(0, pct)))
  }

  function onPointerDown(e: PointerEvent) {
    draggingRef.current = true
    updateSplit(e.clientX)
  }
  function onPointerMove(e: PointerEvent) {
    if (!draggingRef.current) return
    updateSplit(e.clientX)
  }
  function endDrag() {
    draggingRef.current = false
  }

  return (
    <div className="flex min-h-[40vh] items-center justify-center rounded-md border border-paper/10 bg-ink-raised/50 p-6 md:p-10">
      <div
        ref={wrapperRef}
        onPointerDown={showCompare ? onPointerDown : undefined}
        onPointerMove={showCompare ? onPointerMove : undefined}
        onPointerUp={showCompare ? endDrag : undefined}
        onPointerLeave={showCompare ? endDrag : undefined}
        className={`relative max-h-[68vh] max-w-full select-none drop-shadow-[0_20px_40px_rgba(0,0,0,0.45)] ${
          showCompare ? 'cursor-ew-resize' : ''
        }`}
      >
        {showCompare && (
          <canvas ref={beforeRef} className="block max-h-[68vh] max-w-full rounded-sm object-contain" />
        )}

        <div
          className={showCompare ? 'pointer-events-none absolute inset-0 overflow-hidden rounded-sm' : ''}
          style={showCompare ? { clipPath: `inset(0 0 0 ${split}%)` } : undefined}
        >
          <canvas
            ref={afterRef}
            className={
              showCompare
                ? 'block h-full max-h-[68vh] w-full max-w-full object-contain'
                : 'max-h-[68vh] max-w-full rounded-sm object-contain'
            }
          />
        </div>

        {showCompare && (
          <>
            <div
              className="pointer-events-none absolute inset-y-0 w-px bg-paper/70"
              style={{ left: `${split}%` }}
            >
              <div className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-paper/40 bg-ink/80 text-paper/80">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M4.5 3L1.5 7L4.5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9.5 3L12.5 7L9.5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <span className="pointer-events-none absolute left-2 top-2 rounded-sm bg-ink/70 px-2 py-0.5 text-[10px] uppercase tracking-wider text-paper/60">
              до
            </span>
            <span className="pointer-events-none absolute right-2 top-2 rounded-sm bg-ink/70 px-2 py-0.5 text-[10px] uppercase tracking-wider text-paper/60">
              после
            </span>
          </>
        )}
      </div>
    </div>
  )
}
