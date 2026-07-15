import { Pixels } from '../core/pixels'
import { pixelsToBlob } from '../core/canvas'

export type ExportFormat = 'png' | 'jpeg'

export function buildFileName(format: ExportFormat): string {
  return `photo-edited.${format === 'png' ? 'png' : 'jpg'}`
}

export async function exportImage(
  p: Pixels,
  format: ExportFormat,
  quality: number,
): Promise<void> {
  const mime = format === 'png' ? 'image/png' : 'image/jpeg'
  const blob = await pixelsToBlob(p, mime, quality)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = buildFileName(format)
  a.click()
  URL.revokeObjectURL(url)
}
