import JSZip from 'jszip'
import { Pixels } from '../core/pixels'
import { fileToPixels, pixelsToBlob } from '../core/canvas'

export interface BatchResult {
  fileName: string
  error?: string
}

export async function processBatch(
  files: File[],
  operation: (p: Pixels) => Pixels,
  onProgress?: (done: number, total: number) => void,
): Promise<{ zip: Blob; results: BatchResult[] }> {
  const zip = new JSZip()
  const results: BatchResult[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    try {
      const p = await fileToPixels(file)
      const out = operation(p)
      const blob = await pixelsToBlob(out, 'image/png')
      const baseName = file.name.replace(/\.[^.]+$/, '') || `photo-${i + 1}`
      zip.file(`${baseName}-edited.png`, blob)
      results.push({ fileName: file.name })
    } catch {
      results.push({ fileName: file.name, error: 'Не удалось обработать файл' })
    }
    onProgress?.(i + 1, files.length)
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  return { zip: zipBlob, results }
}
