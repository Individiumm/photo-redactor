import { Pixels, clonePixels } from '../core/pixels'

export interface Mask {
  data: Uint8Array
  width: number
  height: number
}

export function createMask(width: number, height: number): Mask {
  return { data: new Uint8Array(width * height), width, height }
}

export function paintMask(mask: Mask, cx: number, cy: number, radius: number): void {
  for (let y = Math.max(0, cy - radius); y <= Math.min(mask.height - 1, cy + radius); y++) {
    for (let x = Math.max(0, cx - radius); x <= Math.min(mask.width - 1, cx + radius); x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= radius * radius) {
        mask.data[y * mask.width + x] = 255
      }
    }
  }
}

export function isMaskEmpty(mask: Mask): boolean {
  return !mask.data.some((v) => v > 0)
}

const NEIGHBORS: [number, number][] = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
]
const RELAXATION_ITERATIONS = 120

function maskBoundingBox(mask: Mask): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = mask.width
  let minY = mask.height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      if (mask.data[y * mask.width + x] > 0) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  return {
    minX: Math.max(0, minX - 1),
    minY: Math.max(0, minY - 1),
    maxX: Math.min(mask.width - 1, maxX + 1),
    maxY: Math.min(mask.height - 1, maxY + 1),
  }
}

function isMasked(mask: Mask, x: number, y: number): boolean {
  return mask.data[y * mask.width + x] > 0
}

export async function inpaint(p: Pixels, mask: Mask): Promise<Pixels> {
  if (isMaskEmpty(mask)) throw new Error('EMPTY_MASK')

  const out = clonePixels(p)
  const { width, height } = p
  const { minX, minY, maxX, maxY } = maskBoundingBox(mask)

  // Seed: each masked pixel starts as the average of its unmasked neighbors.
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (!isMasked(mask, x, y)) continue
      let r = 0, g = 0, b = 0, a = 0, count = 0
      for (const [dx, dy] of NEIGHBORS) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
        if (isMasked(mask, nx, ny)) continue
        const i = (ny * width + nx) * 4
        r += p.data[i]; g += p.data[i + 1]; b += p.data[i + 2]; a += p.data[i + 3]
        count++
      }
      const i = (y * width + x) * 4
      if (count > 0) {
        out.data[i] = r / count
        out.data[i + 1] = g / count
        out.data[i + 2] = b / count
        out.data[i + 3] = a / count
      } else {
        out.data[i] = p.data[i]
        out.data[i + 1] = p.data[i + 1]
        out.data[i + 2] = p.data[i + 2]
        out.data[i + 3] = p.data[i + 3]
      }
    }
  }

  // Relax: diffuse color inward from the hole's boundary.
  for (let iter = 0; iter < RELAXATION_ITERATIONS; iter++) {
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (!isMasked(mask, x, y)) continue
        let r = 0, g = 0, b = 0, a = 0, count = 0
        for (const [dx, dy] of NEIGHBORS) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
          const i = (ny * width + nx) * 4
          r += out.data[i]; g += out.data[i + 1]; b += out.data[i + 2]; a += out.data[i + 3]
          count++
        }
        const i = (y * width + x) * 4
        out.data[i] = r / count
        out.data[i + 1] = g / count
        out.data[i + 2] = b / count
        out.data[i + 3] = a / count
      }
    }
  }

  return out
}
