import { Pixels, createPixels } from '../core/pixels'

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

export async function inpaint(p: Pixels, mask: Mask): Promise<Pixels> {
  if (isMaskEmpty(mask)) throw new Error('EMPTY_MASK')
  const cvModule = await import('@techstark/opencv-js')
  const cv = (cvModule.default ?? cvModule) as any
  const src = cv.matFromImageData({ data: p.data, width: p.width, height: p.height })
  const rgb = new cv.Mat()
  cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB)
  const maskMat = cv.matFromArray(mask.height, mask.width, cv.CV_8UC1, Array.from(mask.data))
  const dst = new cv.Mat()
  cv.inpaint(rgb, maskMat, dst, 3, cv.INPAINT_TELEA)
  const rgba = new cv.Mat()
  cv.cvtColor(dst, rgba, cv.COLOR_RGB2RGBA)
  const out = createPixels(p.width, p.height)
  out.data.set(rgba.data)
  src.delete(); rgb.delete(); maskMat.delete(); dst.delete(); rgba.delete()
  return out
}
