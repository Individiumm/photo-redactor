import { describe, it, expect, vi } from 'vitest'
import { createPixels, setPixel, getPixel } from '../../src/core/pixels'
import { fillBackground, compositeOver } from '../../src/modules/background'

vi.mock('@imgly/background-removal', () => ({ removeBackground: vi.fn() }))

describe('background composition', () => {
  it('fillBackground replaces transparent pixels with color', () => {
    const p = createPixels(1, 1) // alpha 0
    const out = fillBackground(p, [255, 0, 0])
    expect(getPixel(out, 0, 0)).toEqual([255, 0, 0, 255])
  })

  it('fillBackground leaves opaque pixels intact', () => {
    const p = createPixels(1, 1)
    setPixel(p, 0, 0, [1, 2, 3, 255])
    expect(getPixel(fillBackground(p, [255, 0, 0]), 0, 0)).toEqual([1, 2, 3, 255])
  })

  it('compositeOver blends a half-transparent foreground', () => {
    const fg = createPixels(1, 1)
    setPixel(fg, 0, 0, [200, 200, 200, 128])
    const bg = createPixels(1, 1)
    setPixel(bg, 0, 0, [0, 0, 0, 255])
    const [r] = getPixel(compositeOver(fg, bg), 0, 0)
    expect(r).toBeGreaterThan(90)
    expect(r).toBeLessThan(110)
  })
})
