import { describe, it, expect } from 'vitest'
import { buildFileName } from '../../src/modules/exporter'

describe('exporter', () => {
  it('png filename ends with .png', () => {
    expect(buildFileName('png')).toMatch(/\.png$/)
  })
  it('jpeg filename ends with .jpg', () => {
    expect(buildFileName('jpeg')).toMatch(/\.jpg$/)
  })
})
