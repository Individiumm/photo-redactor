import { describe, it, expect } from 'vitest'
import { createPixels } from '../../src/core/pixels'
import { createThumbnail } from '../../src/modules/thumbnail'

describe('createThumbnail', () => {
  it('downscales a wide image, preserving aspect ratio', () => {
    const p = createPixels(200, 100)
    const out = createThumbnail(p, 50)
    expect(out.width).toBe(50)
    expect(out.height).toBe(25)
  })

  it('downscales a tall image, preserving aspect ratio', () => {
    const p = createPixels(50, 200)
    const out = createThumbnail(p, 40)
    expect(out.height).toBe(40)
    expect(out.width).toBe(10)
  })

  it('returns the image unchanged if already within maxSize', () => {
    const p = createPixels(20, 10)
    const out = createThumbnail(p, 50)
    expect(out.width).toBe(20)
    expect(out.height).toBe(10)
  })

  it('never produces a zero-sized dimension for extreme aspect ratios', () => {
    const p = createPixels(1000, 1)
    const out = createThumbnail(p, 10)
    expect(out.width).toBe(10)
    expect(out.height).toBeGreaterThanOrEqual(1)
  })
})
