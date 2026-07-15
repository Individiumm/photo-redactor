import { describe, it, expect, vi } from 'vitest'
import { createMask, paintMask, isMaskEmpty, inpaint } from '../../src/modules/heal'
import { createPixels } from '../../src/core/pixels'

vi.mock('@techstark/opencv-js', () => ({ default: {} }))

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
})
