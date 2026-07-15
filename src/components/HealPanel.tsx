import { useEffect, useRef, useState, PointerEvent } from 'react'
import { useEditor } from '../state/editorStore'
import { pixelsToCanvas } from '../core/canvas'
import { createMask, paintMask, inpaint, Mask } from '../modules/heal'

export default function HealPanel() {
  const { current, commit, busy, setBusy } = useEditor()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const mountedCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const maskRef = useRef<Mask | null>(null)
  const [radius, setRadius] = useState(8)
  const [error, setError] = useState<string | null>(null)

  function ensure(): HTMLCanvasElement | null {
    const p = current()
    if (!p) return null
    if (!canvasRef.current || maskRef.current?.width !== p.width || maskRef.current?.height !== p.height) {
      const c = pixelsToCanvas(p)
      canvasRef.current = c
      maskRef.current = createMask(p.width, p.height)
    }
    return canvasRef.current
  }

  function draw(e: PointerEvent<HTMLCanvasElement>) {
    if (e.buttons !== 1) return
    const el = mountedCanvasRef.current
    const mask = maskRef.current
    if (!el || !mask) return
    const rect = el.getBoundingClientRect()
    const x = Math.round(((e.clientX - rect.left) / rect.width) * el.width)
    const y = Math.round(((e.clientY - rect.top) / rect.height) * el.height)
    paintMask(mask, x, y, radius)
    const ctx = el.getContext('2d')!
    ctx.fillStyle = 'rgba(255,0,0,0.5)'
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  async function apply() {
    const p = current()
    const mask = maskRef.current
    if (!p || !mask) return
    setBusy(true)
    setError(null)
    try {
      commit(await inpaint(p, mask))
      maskRef.current = null
      canvasRef.current = null
    } catch (err) {
      setError(err instanceof Error && err.message === 'EMPTY_MASK'
        ? 'Сначала закрасьте область кистью.'
        : 'Не удалось обработать. Попробуйте меньшую область.')
    } finally {
      setBusy(false)
    }
  }

  const c = ensure()

  useEffect(() => {
    const el = mountedCanvasRef.current
    if (!el || !c) return
    el.width = c.width
    el.height = c.height
    el.getContext('2d')!.drawImage(c, 0, 0)
  }, [c])

  return (
    <div className="space-y-3">
      <label className="block text-sm">Размер кисти: {radius}
        <input type="range" min={2} max={40} value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="w-full" />
      </label>
      {c && (
        <canvas
          ref={mountedCanvasRef}
          onPointerMove={draw}
          className="max-h-[50vh] max-w-full cursor-crosshair rounded border border-neutral-700"
        />
      )}
      <button disabled={busy} onClick={apply} className="w-full rounded bg-indigo-600 py-2 disabled:opacity-50">
        {busy ? 'Обработка…' : 'Убрать закрашенное'}
      </button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  )
}
