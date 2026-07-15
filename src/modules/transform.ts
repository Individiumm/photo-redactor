import { Pixels, createPixels, getPixel, setPixel } from '../core/pixels'

export function crop(p: Pixels, x: number, y: number, w: number, h: number): Pixels {
  const out = createPixels(w, h)
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      setPixel(out, i, j, getPixel(p, x + i, y + j))
    }
  }
  return out
}

export function rotate90(p: Pixels, dir: 'cw' | 'ccw'): Pixels {
  const out = createPixels(p.height, p.width)
  for (let y = 0; y < p.height; y++) {
    for (let x = 0; x < p.width; x++) {
      const rgba = getPixel(p, x, y)
      if (dir === 'cw') setPixel(out, p.height - 1 - y, x, rgba)
      else setPixel(out, y, p.width - 1 - x, rgba)
    }
  }
  return out
}

export function resize(p: Pixels, w: number, h: number): Pixels {
  const out = createPixels(w, h)
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const sx = ((i + 0.5) * p.width) / w - 0.5
      const sy = ((j + 0.5) * p.height) / h - 0.5
      const x0 = Math.max(0, Math.floor(sx))
      const y0 = Math.max(0, Math.floor(sy))
      const x1 = Math.min(p.width - 1, x0 + 1)
      const y1 = Math.min(p.height - 1, y0 + 1)
      const fx = sx - x0
      const fy = sy - y0
      const c00 = getPixel(p, x0, y0)
      const c10 = getPixel(p, x1, y0)
      const c01 = getPixel(p, x0, y1)
      const c11 = getPixel(p, x1, y1)
      const out4: [number, number, number, number] = [0, 0, 0, 0]
      for (let c = 0; c < 4; c++) {
        const top = c00[c] * (1 - fx) + c10[c] * fx
        const bot = c01[c] * (1 - fx) + c11[c] * fx
        out4[c] = top * (1 - fy) + bot * fy
      }
      setPixel(out, i, j, out4)
    }
  }
  return out
}

export interface AspectPreset {
  id: string
  name: string
  ratio: number | null
}

export const ASPECTS: AspectPreset[] = [
  { id: 'free', name: 'Свободно', ratio: null },
  { id: '1:1', name: 'Квадрат 1:1', ratio: 1 },
  { id: '4:5', name: 'Пост 4:5', ratio: 4 / 5 },
  { id: '16:9', name: 'Широкий 16:9', ratio: 16 / 9 },
  { id: '9:16', name: 'Сторис 9:16', ratio: 9 / 16 },
]
