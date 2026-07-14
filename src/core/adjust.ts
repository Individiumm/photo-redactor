import { Pixels, clonePixels } from './pixels'

export interface AdjustSettings {
  brightness: number
  contrast: number
  saturation: number
  warmth: number
  sharpness: number
}

export const NEUTRAL_ADJUST: AdjustSettings = {
  brightness: 0, contrast: 0, saturation: 0, warmth: 0, sharpness: 0,
}

function mapChannels(p: Pixels, fn: (r: number, g: number, b: number) => [number, number, number]): Pixels {
  const out = clonePixels(p)
  for (let i = 0; i < out.data.length; i += 4) {
    const [r, g, b] = fn(out.data[i], out.data[i + 1], out.data[i + 2])
    out.data[i] = r
    out.data[i + 1] = g
    out.data[i + 2] = b
  }
  return out
}

export function brightness(p: Pixels, amount: number): Pixels {
  const add = (amount / 100) * 255
  return mapChannels(p, (r, g, b) => [r + add, g + add, b + add])
}

export function contrast(p: Pixels, amount: number): Pixels {
  const c = (amount / 100) * 128
  const factor = (259 * (c + 255)) / (255 * (259 - c))
  const f = (v: number) => factor * (v - 128) + 128
  return mapChannels(p, (r, g, b) => [f(r), f(g), f(b)])
}

export function saturation(p: Pixels, amount: number): Pixels {
  const s = 1 + amount / 100
  return mapChannels(p, (r, g, b) => {
    const gray = 0.299 * r + 0.587 * g + 0.114 * b
    return [gray + (r - gray) * s, gray + (g - gray) * s, gray + (b - gray) * s]
  })
}

export function warmth(p: Pixels, amount: number): Pixels {
  const d = (amount / 100) * 40
  return mapChannels(p, (r, g, b) => [r + d, g, b - d])
}

export function grayscale(p: Pixels): Pixels {
  return mapChannels(p, (r, g, b) => {
    const y = 0.299 * r + 0.587 * g + 0.114 * b
    return [y, y, y]
  })
}

export function sharpen(p: Pixels, amount: number): Pixels {
  if (amount <= 0) return clonePixels(p)
  const s = amount / 100
  const out = clonePixels(p)
  const { width: w, height: h, data } = p
  const at = (x: number, y: number, c: number) => {
    const cx = Math.min(w - 1, Math.max(0, x))
    const cy = Math.min(h - 1, Math.max(0, y))
    return data[(cy * w + cx) * 4 + c]
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      for (let c = 0; c < 3; c++) {
        const center = at(x, y, c)
        const lap =
          center * (1 + 4 * s) -
          s * (at(x - 1, y, c) + at(x + 1, y, c) + at(x, y - 1, c) + at(x, y + 1, c))
        out.data[i + c] = lap
      }
    }
  }
  return out
}

export function applyAdjustments(p: Pixels, s: AdjustSettings): Pixels {
  let out = p
  if (s.brightness !== 0) out = brightness(out, s.brightness)
  if (s.contrast !== 0) out = contrast(out, s.contrast)
  if (s.saturation !== 0) out = saturation(out, s.saturation)
  if (s.warmth !== 0) out = warmth(out, s.warmth)
  if (s.sharpness !== 0) out = sharpen(out, s.sharpness)
  return out === p ? clonePixels(p) : out
}

export function autoEnhance(p: Pixels): Pixels {
  let min = 255
  let max = 0
  for (let i = 0; i < p.data.length; i += 4) {
    const y = 0.299 * p.data[i] + 0.587 * p.data[i + 1] + 0.114 * p.data[i + 2]
    if (y < min) min = y
    if (y > max) max = y
  }
  if (max - min < 1) return clonePixels(p)
  const scale = 255 / (max - min)
  return mapChannels(p, (r, g, b) => [(r - min) * scale, (g - min) * scale, (b - min) * scale])
}
