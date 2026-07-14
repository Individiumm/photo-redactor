import { describe, it, expect } from 'vitest'
import { createPixels, setPixel, getPixel } from '../../src/core/pixels'
import {
  brightness, contrast, saturation, warmth, grayscale,
  applyAdjustments, autoEnhance, NEUTRAL_ADJUST,
} from '../../src/core/adjust'

function solid(r: number, g: number, b: number, a = 255) {
  const p = createPixels(1, 1)
  setPixel(p, 0, 0, [r, g, b, a])
  return p
}

describe('adjust', () => {
  it('brightness lightens and does not mutate input', () => {
    const p = solid(100, 100, 100)
    const out = brightness(p, 50)
    expect(getPixel(out, 0, 0)[0]).toBeGreaterThan(100)
    expect(getPixel(p, 0, 0)[0]).toBe(100)
  })

  it('brightness clamps at 255', () => {
    const out = brightness(solid(250, 250, 250), 100)
    expect(getPixel(out, 0, 0)[0]).toBe(255)
  })

  it('grayscale equalizes channels', () => {
    const [r, g, b] = getPixel(grayscale(solid(255, 0, 0)), 0, 0)
    expect(r).toBe(g)
    expect(g).toBe(b)
  })

  it('warmth adds red and removes blue', () => {
    const [r, , b] = getPixel(warmth(solid(100, 100, 100), 100), 0, 0)
    expect(r).toBeGreaterThan(100)
    expect(b).toBeLessThan(100)
  })

  it('saturation 0 keeps a gray pixel gray', () => {
    const [r, g, b] = getPixel(saturation(solid(120, 120, 120), 100), 0, 0)
    expect(r).toBe(g)
    expect(g).toBe(b)
  })

  it('contrast pushes mid values away from 128', () => {
    const out = contrast(solid(200, 200, 200), 50)
    expect(getPixel(out, 0, 0)[0]).toBeGreaterThan(200)
  })

  it('applyAdjustments with NEUTRAL keeps pixel unchanged', () => {
    const out = applyAdjustments(solid(77, 88, 99), NEUTRAL_ADJUST)
    expect(getPixel(out, 0, 0)).toEqual([77, 88, 99, 255])
  })

  it('autoEnhance stretches a low-contrast gradient', () => {
    const p = createPixels(2, 1)
    setPixel(p, 0, 0, [100, 100, 100, 255])
    setPixel(p, 1, 0, [150, 150, 150, 255])
    const out = autoEnhance(p)
    expect(getPixel(out, 0, 0)[0]).toBeLessThan(100)
    expect(getPixel(out, 1, 0)[0]).toBeGreaterThan(150)
  })
})
