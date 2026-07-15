import { Pixels } from '../core/pixels'
import { resize } from './transform'

export function createThumbnail(p: Pixels, maxSize: number): Pixels {
  const longest = Math.max(p.width, p.height)
  if (longest <= maxSize) return p
  const scale = maxSize / longest
  const w = Math.max(1, Math.round(p.width * scale))
  const h = Math.max(1, Math.round(p.height * scale))
  return resize(p, w, h)
}
