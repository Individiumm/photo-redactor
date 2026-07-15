import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPixels } from '../../src/core/pixels'

const fileToPixelsMock = vi.fn()
const pixelsToBlobMock = vi.fn()

vi.mock('../../src/core/canvas', () => ({
  fileToPixels: (...args: unknown[]) => fileToPixelsMock(...args),
  pixelsToBlob: (...args: unknown[]) => pixelsToBlobMock(...args),
}))

const zipFileMock = vi.fn()
const generateAsyncMock = vi.fn()

vi.mock('jszip', () => ({
  default: vi.fn().mockImplementation(() => ({
    file: zipFileMock,
    generateAsync: generateAsyncMock,
  })),
}))

import { processBatch } from '../../src/modules/batch'

function file(name: string): File {
  return new File([new Uint8Array([1])], name, { type: 'image/png' })
}

describe('processBatch', () => {
  beforeEach(() => {
    fileToPixelsMock.mockReset()
    pixelsToBlobMock.mockReset()
    zipFileMock.mockReset()
    generateAsyncMock.mockReset()
    generateAsyncMock.mockResolvedValue(new Blob(['zip']))
  })

  it('processes every file, adds each to the zip, and reports progress', async () => {
    fileToPixelsMock.mockResolvedValue(createPixels(2, 2))
    pixelsToBlobMock.mockResolvedValue(new Blob(['png']))
    const progressCalls: Array<[number, number]> = []

    const { zip, results } = await processBatch(
      [file('a.png'), file('b.jpg')],
      (p) => p,
      (done, total) => progressCalls.push([done, total]),
    )

    expect(zip).toBeInstanceOf(Blob)
    expect(results).toEqual([{ fileName: 'a.png' }, { fileName: 'b.jpg' }])
    expect(zipFileMock).toHaveBeenCalledTimes(2)
    expect(zipFileMock.mock.calls[0][0]).toBe('a-edited.png')
    expect(progressCalls).toEqual([[1, 2], [2, 2]])
  })

  it('continues processing after one file fails, recording its error', async () => {
    fileToPixelsMock
      .mockResolvedValueOnce(createPixels(2, 2))
      .mockRejectedValueOnce(new Error('NOT_AN_IMAGE'))
      .mockResolvedValueOnce(createPixels(2, 2))
    pixelsToBlobMock.mockResolvedValue(new Blob(['png']))

    const { results } = await processBatch(
      [file('good1.png'), file('bad.txt'), file('good2.png')],
      (p) => p,
    )

    expect(results).toHaveLength(3)
    expect(results[0].error).toBeUndefined()
    expect(results[1].error).toBeDefined()
    expect(results[2].error).toBeUndefined()
    expect(zipFileMock).toHaveBeenCalledTimes(2)
  })

  it('applies the given operation to every image before zipping', async () => {
    const base = createPixels(2, 2)
    fileToPixelsMock.mockResolvedValue(base)
    pixelsToBlobMock.mockResolvedValue(new Blob(['png']))
    const operation = vi.fn((p) => p)

    await processBatch([file('a.png')], operation)

    expect(operation).toHaveBeenCalledWith(base)
  })
})
