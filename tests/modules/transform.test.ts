import { describe, it, expect } from 'vitest'
import { createPixels, setPixel, getPixel } from '../../src/core/pixels'
import { crop, rotate90, resize, ASPECTS } from '../../src/modules/transform'

function grid2x2() {
  const p = createPixels(2, 2)
  setPixel(p, 0, 0, [10, 0, 0, 255])
  setPixel(p, 1, 0, [20, 0, 0, 255])
  setPixel(p, 0, 1, [30, 0, 0, 255])
  setPixel(p, 1, 1, [40, 0, 0, 255])
  return p
}

describe('transform', () => {
  it('crop extracts a sub-rectangle', () => {
    const out = crop(grid2x2(), 1, 0, 1, 2)
    expect(out.width).toBe(1)
    expect(out.height).toBe(2)
    expect(getPixel(out, 0, 0)[0]).toBe(20)
    expect(getPixel(out, 0, 1)[0]).toBe(40)
  })

  it('rotate90 cw swaps dimensions and moves top-left to top-right', () => {
    const out = rotate90(grid2x2(), 'cw')
    expect(out.width).toBe(2)
    expect(out.height).toBe(2)
    expect(getPixel(out, 1, 0)[0]).toBe(10)
  })

  it('resize changes dimensions', () => {
    const out = resize(grid2x2(), 4, 4)
    expect(out.width).toBe(4)
    expect(out.height).toBe(4)
    expect(getPixel(out, 0, 0)[3]).toBe(255)
  })

  it('exposes aspect presets', () => {
    expect(ASPECTS.map((a) => a.id)).toContain('1:1')
  })
})
