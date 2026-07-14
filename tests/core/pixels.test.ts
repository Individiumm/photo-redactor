import { describe, it, expect } from 'vitest'
import { createPixels, clonePixels, getPixel, setPixel } from '../../src/core/pixels'

describe('pixels', () => {
  it('createPixels makes transparent buffer of right size', () => {
    const p = createPixels(2, 3)
    expect(p.width).toBe(2)
    expect(p.height).toBe(3)
    expect(p.data.length).toBe(2 * 3 * 4)
    expect([...p.data].every((v) => v === 0)).toBe(true)
  })

  it('setPixel/getPixel round-trip', () => {
    const p = createPixels(1, 1)
    setPixel(p, 0, 0, [10, 20, 30, 40])
    expect(getPixel(p, 0, 0)).toEqual([10, 20, 30, 40])
  })

  it('clonePixels is a deep copy', () => {
    const p = createPixels(1, 1)
    setPixel(p, 0, 0, [1, 2, 3, 4])
    const c = clonePixels(p)
    setPixel(c, 0, 0, [9, 9, 9, 9])
    expect(getPixel(p, 0, 0)).toEqual([1, 2, 3, 4])
  })
})
