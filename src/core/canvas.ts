import { Pixels, createPixels } from './pixels'
import { resize } from '../modules/transform'

export const MAX_DIMENSION = 2000

export function pixelsToImageData(p: Pixels): ImageData {
  return new ImageData(new Uint8ClampedArray(p.data), p.width, p.height)
}

export function pixelsToCanvas(p: Pixels): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = p.width
  canvas.height = p.height
  const ctx = canvas.getContext('2d')!
  ctx.putImageData(pixelsToImageData(p), 0, 0)
  return canvas
}

export function downscaleIfNeeded(p: Pixels): Pixels {
  const longest = Math.max(p.width, p.height)
  if (longest <= MAX_DIMENSION) return p
  const scale = MAX_DIMENSION / longest
  return resize(p, Math.round(p.width * scale), Math.round(p.height * scale))
}

export function fileToPixels(file: File): Promise<Pixels> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const p = createPixels(canvas.width, canvas.height)
      p.data.set(data.data)
      resolve(downscaleIfNeeded(p))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('NOT_AN_IMAGE'))
    }
    img.src = url
  })
}

export function pixelsToBlob(
  p: Pixels,
  type: 'image/png' | 'image/jpeg',
  quality = 0.92,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    pixelsToCanvas(p).toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('EXPORT_FAILED'))),
      type,
      quality,
    )
  })
}
