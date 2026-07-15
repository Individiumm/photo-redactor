import { describe, it, expect } from 'vitest'
import { createPixels, setPixel, getPixel } from '../../src/core/pixels'
import { PRESETS, getPreset } from '../../src/core/filters'

function solid(r: number, g: number, b: number) {
  const p = createPixels(1, 1)
  setPixel(p, 0, 0, [r, g, b, 255])
  return p
}

describe('filters', () => {
  it('exposes named presets with stable ids', () => {
    const ids = PRESETS.map((f) => f.id)
    expect(ids).toContain('noir')
    expect(ids).toContain('vintage')
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('original preset returns an equal-looking pixel', () => {
    const out = getPreset('original')!.apply(solid(50, 100, 150))
    expect(getPixel(out, 0, 0)).toEqual([50, 100, 150, 255])
  })

  it('noir makes the image grayscale', () => {
    const [r, g, b] = getPixel(getPreset('noir')!.apply(solid(200, 50, 10)), 0, 0)
    expect(r).toBe(g)
    expect(g).toBe(b)
  })

  it('every preset preserves dimensions and alpha', () => {
    for (const preset of PRESETS) {
      const out = preset.apply(solid(120, 120, 120))
      expect(out.width).toBe(1)
      expect(getPixel(out, 0, 0)[3]).toBe(255)
    }
  })
})
