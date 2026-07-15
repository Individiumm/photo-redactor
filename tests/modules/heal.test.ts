import { describe, it, expect } from 'vitest'
import { createMask, paintMask, isMaskEmpty, inpaint } from '../../src/modules/heal'
import { createPixels, setPixel, getPixel } from '../../src/core/pixels'

function fillSolid(width: number, height: number, rgba: [number, number, number, number]) {
  const p = createPixels(width, height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) setPixel(p, x, y, rgba)
  }
  return p
}

describe('heal mask', () => {
  it('new mask is empty', () => {
    expect(isMaskEmpty(createMask(4, 4))).toBe(true)
  })

  it('paintMask marks pixels within radius', () => {
    const m = createMask(5, 5)
    paintMask(m, 2, 2, 1)
    expect(m.data[2 * 5 + 2]).toBe(255)
    expect(isMaskEmpty(m)).toBe(false)
  })

  it('inpaint rejects an empty mask', async () => {
    await expect(inpaint(createPixels(4, 4), createMask(4, 4))).rejects.toThrow('EMPTY_MASK')
  })

  it('inpaint fills a single masked pixel with the surrounding color', async () => {
    const p = fillSolid(5, 5, [100, 150, 200, 255])
    setPixel(p, 2, 2, [0, 0, 0, 0]) // the "defect" pixel to heal
    const mask = createMask(5, 5)
    paintMask(mask, 2, 2, 0)
    const out = await inpaint(p, mask)
    const [r, g, b, a] = getPixel(out, 2, 2)
    expect(r).toBeCloseTo(100, 0)
    expect(g).toBeCloseTo(150, 0)
    expect(b).toBeCloseTo(200, 0)
    expect(a).toBeCloseTo(255, 0)
  })

  it('inpaint leaves pixels outside the mask unchanged', async () => {
    const p = fillSolid(5, 5, [100, 150, 200, 255])
    setPixel(p, 2, 2, [0, 0, 0, 0])
    const mask = createMask(5, 5)
    paintMask(mask, 2, 2, 0)
    const out = await inpaint(p, mask)
    expect(getPixel(out, 0, 0)).toEqual([100, 150, 200, 255])
    expect(getPixel(out, 4, 4)).toEqual([100, 150, 200, 255])
  })

  it('inpaint preserves image dimensions', async () => {
    const p = fillSolid(6, 4, [10, 20, 30, 255])
    const mask = createMask(6, 4)
    paintMask(mask, 3, 2, 1)
    const out = await inpaint(p, mask)
    expect(out.width).toBe(6)
    expect(out.height).toBe(4)
  })
})
